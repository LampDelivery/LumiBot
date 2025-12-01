const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const ALIUCORD_GUILD_ID = '811255666990907402';
const PLUGIN_LIST_CHANNEL_ID = '811275162715553823';
const PLUGINS_PER_PAGE = 5;

let cachedPlugins = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;

function parsePluginMessage(message) {
  const content = message.content;
  if (!content) return null;

  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return null;

  const nameMatch = lines[0].match(/\*\*(.+?)\*\*/);
  if (!nameMatch) return null;

  const name = nameMatch[1];
  
  let description = '';
  let downloadLink = '';
  let info = '';
  let author = message.author?.username || 'Unknown';

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('<') && line.endsWith('>')) {
      downloadLink = line.slice(1, -1);
    } else if (line.toLowerCase().startsWith('info:')) {
      info = line.substring(5).trim();
    } else if (!line.startsWith('http')) {
      if (description) description += ' ';
      description += line;
    }
  }

  if (!downloadLink) {
    const linkMatch = content.match(/<?(https?:\/\/[^\s>]+\.zip)>?/);
    if (linkMatch) {
      downloadLink = linkMatch[1];
    }
  }

  if (!downloadLink) return null;

  return {
    name,
    description: description || 'No description',
    downloadLink,
    info,
    author,
    messageId: message.id
  };
}

async function fetchPlugins(client) {
  const now = Date.now();
  if (cachedPlugins.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedPlugins;
  }

  try {
    const channel = await client.channels.fetch(PLUGIN_LIST_CHANNEL_ID);
    if (!channel) return [];

    const messages = await channel.messages.fetch({ limit: 100 });
    const plugins = [];

    messages.forEach(message => {
      const plugin = parsePluginMessage(message);
      if (plugin) {
        plugins.push(plugin);
      }
    });

    cachedPlugins = plugins;
    cacheTimestamp = now;
    return plugins;
  } catch (err) {
    console.error('Error fetching plugins:', err);
    return cachedPlugins.length > 0 ? cachedPlugins : [];
  }
}

function filterPlugins(plugins, search) {
  if (!search) return plugins;
  
  const searchLower = search.toLowerCase();
  return plugins.filter(plugin => 
    plugin.name.toLowerCase().includes(searchLower) ||
    plugin.description.toLowerCase().includes(searchLower) ||
    plugin.author.toLowerCase().includes(searchLower)
  );
}

function truncate(text, maxLength = 200) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

function createPluginEmbed(plugins, page, totalPages, search) {
  const start = page * PLUGINS_PER_PAGE;
  const pagePlugins = plugins.slice(start, start + PLUGINS_PER_PAGE);

  let description = '';
  
  pagePlugins.forEach((plugin, index) => {
    description += `**${start + index + 1}. ${truncate(plugin.name, 100)}**\n`;
    description += `${truncate(plugin.description, 200)}\n`;
    if (plugin.info) {
      description += `*${truncate(plugin.info, 150)}*\n`;
    }
    description += `${plugin.downloadLink}\n\n`;
  });

  return {
    title: search ? `Plugin Search: "${truncate(search, 50)}"` : 'Aliucord Plugins',
    description: description || 'No plugins found.',
    footer: { text: `Page ${page + 1} of ${totalPages} | ${plugins.length} plugin${plugins.length !== 1 ? 's' : ''} found` },
    color: 0x3DDC84
  };
}

function createPaginationButtons(page, totalPages, search) {
  const searchParam = search ? `_${Buffer.from(search).toString('base64')}` : '';
  
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`plugins_prev_${page}${searchParam}`)
        .setLabel('Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`plugins_next_${page}${searchParam}`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1),
      new ButtonBuilder()
        .setCustomId('plugins_refresh')
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Primary)
    );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('plugins')
    .setDescription('Browse Aliucord plugins')
    .addStringOption(option =>
      option.setName('search')
        .setDescription('Search for plugins by name, description, or author')
        .setRequired(false)),

  async execute(interaction) {
    const isAliucord = interaction.guildId === ALIUCORD_GUILD_ID;

    await interaction.deferReply({ ephemeral: true });

    const search = interaction.options.getString('search');
    const allPlugins = await fetchPlugins(interaction.client);
    const plugins = filterPlugins(allPlugins, search);

    if (plugins.length === 0) {
      return interaction.editReply('No plugins found.');
    }

    if (isAliucord) {
      const totalPages = Math.max(1, Math.ceil(plugins.length / PLUGINS_PER_PAGE));
      const page = 0;

      const embed = createPluginEmbed(plugins, page, totalPages, search);
      const buttons = createPaginationButtons(page, totalPages, search);

      await interaction.editReply({
        embeds: [embed],
        components: plugins.length > PLUGINS_PER_PAGE ? [buttons] : []
      });
    } else {
      const start = Math.min(5, plugins.length);
      let content = search ? `**Search results for: "${search}"** (showing first ${start})\n\n` : `**Aliucord Plugins** (showing first ${start})\n\n`;
      
      plugins.slice(0, 5).forEach((plugin, index) => {
        content += `**${index + 1}. ${plugin.name}**\n`;
        content += `${plugin.description}\n`;
        content += `${plugin.downloadLink}\n\n`;
      });

      if (plugins.length > 5) {
        content += `*Showing 5 of ${plugins.length} plugins. Use the search parameter to narrow results.*`;
      }

      await interaction.editReply(content);
    }
  },

  async executePrefix(message, args) {
    const isAliucord = message.guild && message.guild.id === ALIUCORD_GUILD_ID;
    
    const search = args.join(' ') || null;
    const allPlugins = await fetchPlugins(message.client);
    const plugins = filterPlugins(allPlugins, search);

    if (plugins.length === 0) {
      return message.reply('No plugins found.');
    }

    if (isAliucord) {
      const totalPages = Math.max(1, Math.ceil(plugins.length / PLUGINS_PER_PAGE));
      const page = 0;

      const embed = createPluginEmbed(plugins, page, totalPages, search);
      const buttons = createPaginationButtons(page, totalPages, search);

      await message.reply({
        embeds: [embed],
        components: plugins.length > PLUGINS_PER_PAGE ? [buttons] : []
      });
    } else {
      const start = Math.min(5, plugins.length);
      let content = search ? `**Search results for: "${search}"** (showing first ${start})\n\n` : `**Aliucord Plugins** (showing first ${start})\n\n`;
      
      plugins.slice(0, 5).forEach((plugin, index) => {
        content += `**${index + 1}. ${plugin.name}**\n`;
        content += `${plugin.description}\n`;
        content += `${plugin.downloadLink}\n\n`;
      });

      if (plugins.length > 5) {
        content += `*Showing 5 of ${plugins.length} plugins. Use the search parameter to narrow results.*`;
      }

      await message.reply(content);
    }
  },

  async handleButton(interaction, action, page, searchBase64) {
    const search = searchBase64 ? Buffer.from(searchBase64, 'base64').toString('utf8') : null;
    
    if (action === 'refresh') {
      cacheTimestamp = 0;
    }

    const allPlugins = await fetchPlugins(interaction.client);
    const plugins = filterPlugins(allPlugins, search);
    const totalPages = Math.max(1, Math.ceil(plugins.length / PLUGINS_PER_PAGE));

    let newPage = parseInt(page) || 0;
    
    if (action === 'prev') {
      newPage = Math.max(0, newPage - 1);
    } else if (action === 'next') {
      newPage = Math.min(totalPages - 1, newPage + 1);
    } else if (action === 'refresh') {
      newPage = 0;
    }

    const embed = createPluginEmbed(plugins, newPage, totalPages, search);
    const buttons = createPaginationButtons(newPage, totalPages, search);

    await interaction.update({
      embeds: [embed],
      components: plugins.length > PLUGINS_PER_PAGE ? [buttons] : []
    });
  },

  fetchPlugins,
  filterPlugins,
  ALIUCORD_GUILD_ID
};

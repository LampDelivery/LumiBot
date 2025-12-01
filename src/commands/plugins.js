const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const MANIFEST_URL = 'https://plugins.aliucord.com/manifest.json';
const PLUGINS_PER_PAGE = 5;

let cachedPlugins = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

async function fetchPlugins() {
  const now = Date.now();
  if (cachedPlugins.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedPlugins;
  }

  try {
    const response = await fetch(MANIFEST_URL);
    if (!response.ok) {
      console.error(`Error fetching manifest: HTTP ${response.status}`);
      return cachedPlugins.length > 0 ? cachedPlugins : [];
    }

    const data = await response.json();
    const plugins = [];

    if (Array.isArray(data)) {
      for (const plugin of data) {
        if (plugin.name && plugin.url) {
          const authors = Array.isArray(plugin.authors) ? plugin.authors.join(', ') : 'Unknown';
          plugins.push({
            name: plugin.name,
            description: plugin.description || 'No description',
            url: plugin.url,
            version: plugin.version || '',
            authors: authors,
            changelog: plugin.changelog || ''
          });
        }
      }
    }

    cachedPlugins = plugins;
    cacheTimestamp = now;
    console.log(`Fetched ${plugins.length} plugins from Aliucord manifest`);
    return plugins;
  } catch (err) {
    console.error('Error fetching plugins from manifest:', err);
    return cachedPlugins.length > 0 ? cachedPlugins : [];
  }
}

async function initializePluginCache() {
  console.log('Initializing plugin cache...');
  await fetchPlugins();
}

function filterPlugins(plugins, search) {
  if (!search) return plugins;
  
  const searchLower = search.toLowerCase();
  return plugins.filter(plugin => 
    plugin.name.toLowerCase().includes(searchLower) ||
    plugin.description.toLowerCase().includes(searchLower) ||
    plugin.authors.toLowerCase().includes(searchLower)
  );
}

function formatPluginLine(plugin) {
  let text = `[${plugin.name}](${plugin.url})\n`;
  text += plugin.description;
  if (plugin.authors) {
    text += ` - ${plugin.authors}`;
  }
  return text;
}

function buildPaginationRow(page, totalPages, hasSearch = false) {
  const row = new ActionRowBuilder();
  
  const prevBtn = new ButtonBuilder()
    .setCustomId(`plugins_prev_${page}${hasSearch ? '_1' : '_0'}`)
    .setLabel('Previous')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(page === 0);
  
  const nextBtn = new ButtonBuilder()
    .setCustomId(`plugins_next_${page}${hasSearch ? '_1' : '_0'}`)
    .setLabel('Next')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(page === totalPages - 1);
  
  row.addComponents(prevBtn, nextBtn);
  return row;
}

async function handleButton(interaction, action, page, hasSearch) {
  const search = hasSearch === '1' ? interaction.message.content.match(/Search results for: "([^"]+)"/)?.[1] : null;
  const allPlugins = await fetchPlugins();
  const filteredPlugins = search ? filterPlugins(allPlugins, search) : allPlugins;

  page = parseInt(page);
  if (action === 'next') page++;
  if (action === 'prev') page--;

  const totalPages = Math.ceil(filteredPlugins.length / PLUGINS_PER_PAGE);
  if (page < 0 || page >= totalPages) {
    return interaction.reply({ content: 'Invalid page.', flags: MessageFlags.Ephemeral });
  }

  const start = page * PLUGINS_PER_PAGE;
  const pagePlugins = filteredPlugins.slice(start, start + PLUGINS_PER_PAGE);

  let content = '';
  if (search) {
    content += `**Search results for: "${search}"** (${filteredPlugins.length} found)\n\n`;
  } else {
    content += `**All Plugins** (Page ${page + 1}/${totalPages})\n\n`;
  }

  pagePlugins.forEach((plugin, index) => {
    content += formatPluginLine(plugin);
    if (index < pagePlugins.length - 1) content += '\n\n';
  });

  const row = buildPaginationRow(page, totalPages, !!search);
  await interaction.update({ content, components: [row] });
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
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const search = interaction.options.getString('search');
    const allPlugins = await fetchPlugins();
    const filteredPlugins = search ? filterPlugins(allPlugins, search) : allPlugins;

    if (filteredPlugins.length === 0) {
      return interaction.editReply('No plugins found.');
    }

    const page = 0;
    const totalPages = Math.ceil(filteredPlugins.length / PLUGINS_PER_PAGE);
    const start = page * PLUGINS_PER_PAGE;
    const pagePlugins = filteredPlugins.slice(start, start + PLUGINS_PER_PAGE);

    let content = '';
    if (search) {
      content += `**Search results for: "${search}"** (${filteredPlugins.length} found)\n\n`;
    } else {
      content += `**All Plugins** (Page ${page + 1}/${totalPages})\n\n`;
    }

    pagePlugins.forEach((plugin, index) => {
      content += formatPluginLine(plugin);
      if (index < pagePlugins.length - 1) content += '\n\n';
    });

    const row = buildPaginationRow(page, totalPages, !!search);
    await interaction.editReply({ content, components: [row] });
  },

  async executePrefix(message, args) {
    const search = args.join(' ') || null;
    const allPlugins = await fetchPlugins();
    const filteredPlugins = search ? filterPlugins(allPlugins, search) : allPlugins;

    if (filteredPlugins.length === 0) {
      return message.reply('No plugins found.');
    }

    const page = 0;
    const totalPages = Math.ceil(filteredPlugins.length / PLUGINS_PER_PAGE);
    const start = page * PLUGINS_PER_PAGE;
    const pagePlugins = filteredPlugins.slice(start, start + PLUGINS_PER_PAGE);

    let content = '';
    if (search) {
      content += `**Search results for: "${search}"** (${filteredPlugins.length} found)\n\n`;
    } else {
      content += `**All Plugins** (Page ${page + 1}/${totalPages})\n\n`;
    }

    pagePlugins.forEach((plugin, index) => {
      content += formatPluginLine(plugin);
      if (index < pagePlugins.length - 1) content += '\n\n';
    });

    const row = buildPaginationRow(page, totalPages, !!search);
    await message.reply({ content, components: [row] });
  },

  handleButton,
  fetchPlugins,
  filterPlugins,
  initializePluginCache
};

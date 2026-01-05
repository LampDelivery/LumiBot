const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getConfigByGuildId } = require('../utils/serverConfig');

const PLUGINS_PER_PAGE = 5;

// Supported channels for "hold to install" feature
const SUPPORTED_CHANNELS = [
  '811261298997460992',
  '847566769258233926',
  '811262084968742932',
  '811263527239024640'
];

const RESTRICTED_ROLES = [
  '1397067198761144361',
  '850135594704175125',
  '822166495537791038'
];

function isChannelSupported(channelId) {
  return SUPPORTED_CHANNELS.includes(channelId);
}

function hasPermission(member, channelId) {
  // bot-spam doesn't have role restrictions
  if (channelId === '811263527239024640') return true;
  // Other support channels require specific roles
  if (RESTRICTED_ROLES.some(roleId => member.roles.cache.has(roleId))) return true;
  return false;
}

let cachedPlugins = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

function isChannelSupported(channelId) {
  return SUPPORTED_CHANNELS.includes(channelId);
}

// Force cache refresh on startup
function clearPluginCache() {
  cachedPlugins = [];
  cacheTimestamp = 0;
}

function normalizePluginUrl(url) {
  // Handle jsDelivr with @refs/heads
  if (url.includes("cdn.jsdelivr.net") && url.includes("@refs/heads/")) {
    return url
      .replace("cdn.jsdelivr.net/gh/", "github.com/")
      .replace("@refs/heads/", "/raw/");
  }

  // Handle jsDelivr with @branch (without refs/heads)
  if (url.includes("cdn.jsdelivr.net/gh/")) {
    return url
      .replace("cdn.jsdelivr.net/gh/", "github.com/")
      .replace(/@([^/]+)\//, "/raw/$1/");
  }

  // Handle GitHub refs/heads
  if (url.includes("/raw/refs/heads/")) {
    return url.replace("/raw/refs/heads/", "/raw/");
  }

  // Handle raw.githubusercontent refs/heads
  if (url.includes("raw.githubusercontent.com") && url.includes("/refs/heads/")) {
    return url.replace("/refs/heads/", "/");
  }

  return url;
}

async function fetchPlugins(guildId) {
  const now = Date.now();
  if (cachedPlugins.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedPlugins;
  }

  try {
    const config = getConfigByGuildId(guildId);
    const MANIFEST_URL = config.plugins.url;
    
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
          let authors = 'Unknown';
          if (Array.isArray(plugin.authors)) {
            authors = plugin.authors.map(a => {
              if (typeof a === 'string') return a;
              if (a && typeof a === 'object' && a.name) return a.name;
              return 'Unknown';
            }).join(', ');
          }
          const normalizedUrl = normalizePluginUrl(plugin.url);
          plugins.push({
            name: plugin.name,
            description: plugin.description || 'No description',
            url: normalizedUrl,
            version: plugin.version || '',
            authors: authors,
            changelog: plugin.changelog || ''
          });
        }
      }
    }

    cachedPlugins = plugins;
    cacheTimestamp = now;
    console.log(`Fetched ${plugins.length} plugins from server ${guildId}`);
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

function filterPlugins(plugins, search, author) {
  let filtered = plugins;
  
  if (author) {
    const authorLower = author.toLowerCase();
    filtered = filtered.filter(plugin => 
      plugin.authors.toLowerCase().includes(authorLower)
    );
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(plugin => 
      plugin.name.toLowerCase().includes(searchLower) ||
      plugin.description.toLowerCase().includes(searchLower)
    );
  }
  
  return filtered;
}

function escapeMarkdown(text) {
  return text.replace(/[*_~`[\]()]/g, '\\$&');
}

function formatPluginLine(plugin) {
  let text = `[${plugin.name}](<${plugin.url}>)\n`;
  text += escapeMarkdown(plugin.description);
  if (plugin.authors) {
    text += ` - ${escapeMarkdown(plugin.authors)}`;
  }
  return text;
}

function encodeFilter(str) {
  if (!str) return '';
  return Buffer.from(str).toString('base64').replace(/=/g, '');
}

function decodeFilter(str) {
  if (!str) return null;
  const padded = str + '='.repeat((4 - str.length % 4) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function buildPaginationRow(page, totalPages, search = null, author = null, plugins = [], isKettu = false) {
  const row = new ActionRowBuilder();
  const encodedSearch = encodeFilter(search || '');
  const encodedAuthor = encodeFilter(author || '');
  
  const prevBtn = new ButtonBuilder()
    .setCustomId(`plugins_prev_${page}_${encodedSearch}_${encodedAuthor}`)
    .setLabel('Previous')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(page === 0);
  
  const nextBtn = new ButtonBuilder()
    .setCustomId(`plugins_next_${page}_${encodedSearch}_${encodedAuthor}`)
    .setLabel('Next')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(page === totalPages - 1);
  
  row.addComponents(prevBtn, nextBtn);
  
  // For Kettu, add copy buttons for each plugin
  if (isKettu && plugins.length > 0) {
    const rows = [row];
    
    // Create rows with copy buttons (max 5 per row)
    let currentRow = new ActionRowBuilder();
    plugins.forEach((plugin, index) => {
      if (!plugin.url.toLowerCase().endsWith('.zip')) {
        const copyBtn = new ButtonBuilder()
          .setCustomId(`plugins_copy_${page}_${index}`)
          .setLabel(`Copy ${plugin.name.substring(0, 12)}${plugin.name.length > 12 ? '...' : ''}`)
          .setStyle(ButtonStyle.Secondary);
        
        if (currentRow.components.length < 5) {
          currentRow.addComponents(copyBtn);
        } else {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder().addComponents(copyBtn);
        }
      }
    });
    
    if (currentRow.components.length > 0) {
      rows.push(currentRow);
    }
    
    return rows;
  }
  
  return [row];
}

async function handleButton(interaction, action, page, encodedSearch, encodedAuthor) {
  try {
    const search = decodeFilter(encodedSearch);
    const author = decodeFilter(encodedAuthor);
    const allPlugins = await fetchPlugins(interaction.guildId);
    const filteredPlugins = filterPlugins(allPlugins, search, author);
    const { SERVER_CONFIGS } = require('../utils/serverConfig');
    const isKettu = interaction.guildId === SERVER_CONFIGS.KETTU.guildId;

    page = parseInt(page);
    if (action === 'next') page++;
    if (action === 'prev') page--;

    const totalPages = Math.ceil(filteredPlugins.length / PLUGINS_PER_PAGE);
    if (page < 0 || page >= totalPages) {
      return await interaction.update({ content: 'Invalid page.', components: [] });
    }

    const start = page * PLUGINS_PER_PAGE;
    const pagePlugins = filteredPlugins.slice(start, start + PLUGINS_PER_PAGE);

    let content = '';
    const isSupported = isChannelSupported(interaction.channelId);
    const hasFilter = search || author;
    if (hasFilter) {
      let filterText = [];
      if (search) filterText.push(`"${search}"`);
      if (author) filterText.push(`by ${author}`);
      content += `**Plugins ${filterText.join(' ')}** (${filteredPlugins.length} found)\n\n`;
    } else {
      content += `**All Plugins** (Page ${page + 1}/${totalPages})\n\n`;
    }

    pagePlugins.forEach((plugin, index) => {
      content += formatPluginLine(plugin);
      if (index < pagePlugins.length - 1) content += '\n\n';
    });

    if (isSupported && !isKettu) {
      content += '\n​\n-# hold this message (not the links) to install';
    }

    const rows = buildPaginationRow(page, totalPages, search, author, pagePlugins, isKettu);
    await interaction.update({ content, components: rows });
    
  } catch (err) {
    console.error('Error in handleButton:', err);
  }
}

function getUniqueAuthors(plugins) {
  const authorsSet = new Set();
  plugins.forEach(p => {
    if (p.authors && p.authors !== 'Unknown') {
      p.authors.split(', ').forEach(author => authorsSet.add(author.trim()));
    }
  });
  return Array.from(authorsSet).sort();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('plugins')
    .setDescription('Browse Aliucord plugins')
    .addStringOption(option =>
      option.setName('search')
        .setDescription('Search for plugins by name or description')
        .setRequired(false)
        .setAutocomplete(true))
    .addStringOption(option =>
      option.setName('author')
        .setDescription('Filter plugins by author')
        .setRequired(false)
        .setAutocomplete(true))
    .addBooleanOption(option =>
      option.setName('send')
        .setDescription('Send publicly or privately (default: private)')
        .setRequired(false)),

  async execute(interaction) {
    const isSupported = isChannelSupported(interaction.channelId);

    // Only allow command in supported channels
    if (!isSupported) {
      await interaction.deferReply();
      try {
        const msg = await interaction.followUp({
          content: 'Please use <#811263527239024640> to use this command.'
        });
        setTimeout(() => msg.delete().catch(() => {}), 30000);
      } catch (err) {
        console.error('Error sending info message:', err);
      }
      return;
    }

    // Role restriction check for support channels
    if (!hasPermission(interaction.member, interaction.channelId)) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command in this channel. Please use <#811263527239024640> instead.',
        flags: MessageFlags.Ephemeral
      });
    }

    const send = interaction.options.getBoolean('send') ?? false;
    const deferOptions = send ? {} : { flags: MessageFlags.Ephemeral };
    await interaction.deferReply(deferOptions);

    const search = interaction.options.getString('search');
    const author = interaction.options.getString('author');
    const allPlugins = await fetchPlugins(interaction.guildId);
    const filteredPlugins = filterPlugins(allPlugins, search, author);

    if (filteredPlugins.length === 0) {
      return interaction.editReply('No plugins found.');
    }

    const { SERVER_CONFIGS } = require('../utils/serverConfig');
    const isKettu = interaction.guildId === SERVER_CONFIGS.KETTU.guildId;
    
    const page = 0;
    const totalPages = Math.ceil(filteredPlugins.length / PLUGINS_PER_PAGE);
    const start = page * PLUGINS_PER_PAGE;
    const pagePlugins = filteredPlugins.slice(start, start + PLUGINS_PER_PAGE);

    let content = '';
    const hasFilter = search || author;
    if (hasFilter) {
      let filterText = [];
      if (search) filterText.push(`"${search}"`);
      if (author) filterText.push(`by ${author}`);
      content += `**Plugins ${filterText.join(' ')}** (${filteredPlugins.length} found)\n\n`;
    } else {
      content += `**All Plugins** (Page ${page + 1}/${totalPages})\n\n`;
    }

    pagePlugins.forEach((plugin, index) => {
      content += formatPluginLine(plugin);
      if (index < pagePlugins.length - 1) content += '\n\n';
    });

    if (!isKettu) {
      content += '\n​\n-# hold this message (not the links) to install';
    }

    const rows = buildPaginationRow(page, totalPages, search, author, pagePlugins, isKettu);
    await interaction.editReply({ content, components: rows });
  },

  async executePrefix(message, args) {
    try {
      const isSupported = isChannelSupported(message.channelId);

      // Only allow command in supported channels
      if (!isSupported) {
        try {
          const msg = await message.reply({
            content: 'Please use <#811263527239024640> to use this command.'
          });
          setTimeout(() => msg.delete().catch(() => {}), 30000);
        } catch (err) {
          console.error('Error sending info message:', err);
        }
        return;
      }

      // Role restriction check for support channels
      if (!hasPermission(message.member, message.channelId)) {
        try {
          const msg = await message.reply('❌ You do not have permission to use this command in this channel. Please use <#811263527239024640> instead.');
          setTimeout(() => msg.delete().catch(() => {}), 15000);
        } catch (err) {
          console.error('Error sending permission message:', err);
        }
        return;
      }

      let search = null;
      let author = null;
      
      const authorIndex = args.indexOf('-a');
      if (authorIndex !== -1) {
        const afterFlag = args.slice(authorIndex + 1);
        const nextFlagIndex = afterFlag.findIndex(a => a.startsWith('-'));
        if (nextFlagIndex === -1) {
          author = afterFlag.join(' ').trim() || null;
          search = args.slice(0, authorIndex).join(' ').trim() || null;
        } else {
          author = afterFlag.slice(0, nextFlagIndex).join(' ').trim() || null;
          search = args.slice(0, authorIndex).join(' ').trim() || null;
        }
      } else {
        search = args.join(' ').trim() || null;
      }

      const allPlugins = await fetchPlugins(message.guildId);
      const filteredPlugins = filterPlugins(allPlugins, search, author);

      if (filteredPlugins.length === 0) {
        await message.reply('No plugins found.');
        return;
      }

      const { SERVER_CONFIGS } = require('../utils/serverConfig');
      const isKettu = message.guildId === SERVER_CONFIGS.KETTU.guildId;
      
      const page = 0;
      const totalPages = Math.ceil(filteredPlugins.length / PLUGINS_PER_PAGE);
      const start = page * PLUGINS_PER_PAGE;
      const pagePlugins = filteredPlugins.slice(start, start + PLUGINS_PER_PAGE);

      let content = '';
      const hasFilter = search || author;
      if (hasFilter) {
        let filterText = [];
        if (search) filterText.push(`"${search}"`);
        if (author) filterText.push(`by ${author}`);
        content += `**Plugins ${filterText.join(' ')}** (${filteredPlugins.length} found)\n\n`;
      } else {
        content += `**All Plugins** (Page ${page + 1}/${totalPages})\n\n`;
      }

      pagePlugins.forEach((plugin, index) => {
        content += formatPluginLine(plugin);
        if (index < pagePlugins.length - 1) content += '\n\n';
      });

      if (!isKettu) {
        content += '\n​\n-# hold this message (not the links) to install';
      }

      const rows = buildPaginationRow(page, totalPages, search, author, pagePlugins, isKettu);
      await message.reply({ content, components: rows });
    } catch (err) {
      console.error('Error in executePrefix:', err);
      try {
        await message.reply('There was an error executing this command.');
      } catch (replyErr) {
        console.error('Could not send error reply:', replyErr);
      }
    }
  },

  async autocomplete(interaction) {
    try {
      const focusedOption = interaction.options.getFocused(true);
      const focusedValue = focusedOption.value;
      
      if (!focusedValue) {
        await interaction.respond([]);
        return;
      }

      const allPlugins = await fetchPlugins(interaction.guildId);
      const searchLower = focusedValue.toLowerCase();
      
      if (focusedOption.name === 'author') {
        const authors = getUniqueAuthors(allPlugins);
        const matches = authors
          .filter(author => author.toLowerCase().includes(searchLower))
          .slice(0, 25)
          .map(author => ({
            name: author,
            value: author
          }));
        await interaction.respond(matches);
      } else {
        const matches = allPlugins
          .filter(p => p.name.toLowerCase().includes(searchLower))
          .slice(0, 25)
          .map(plugin => ({
            name: plugin.name,
            value: plugin.name
          }));
        await interaction.respond(matches);
      }
    } catch (err) {
      console.error('Error in autocomplete:', err);
      await interaction.respond([]).catch(() => {});
    }
  },

  async handleCopyButton(interaction, page, index) {
    try {
      const allPlugins = await fetchPlugins(interaction.guildId);
      
      if (index < 0 || index >= allPlugins.length) {
        return await interaction.reply({
          content: '❌ Plugin not found.',
          flags: MessageFlags.Ephemeral
        });
      }
      
      const plugin = allPlugins[index];
      await interaction.reply({
        content: `\`\`\`\n${plugin.url}\n\`\`\``,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      console.error('Error in handleCopyButton:', error);
      await interaction.reply({
        content: '❌ Error copying link.',
        flags: MessageFlags.Ephemeral
      });
    }
  },

  handleButton,
  fetchPlugins,
  filterPlugins,
  initializePluginCache,
  clearPluginCache
};

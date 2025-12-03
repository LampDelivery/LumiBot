const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const MANIFEST_URL = 'https://plugins.aliucord.com/manifest.json';
const PLUGINS_PER_PAGE = 5;

// Supported channels for "hold to install" feature
const SUPPORTED_CHANNELS = [
  '811261298997460992',
  '847566769258233926',
  '875213883776847873'
];

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

function escapeMarkdown(text) {
  return text.replace(/[*_~`[\]()]/g, '\\$&');
}

function formatPluginLine(plugin) {
  let text = `[${plugin.name}](${plugin.url})\n`;
  text += escapeMarkdown(plugin.description);
  if (plugin.authors) {
    text += ` - ${escapeMarkdown(plugin.authors)}`;
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
  try {
    const search = hasSearch === '1' ? interaction.message.content.match(/Search results for: "([^"]+)"/)?.[1] : null;
    const allPlugins = await fetchPlugins();
    const filteredPlugins = search ? filterPlugins(allPlugins, search) : allPlugins;

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
    if (search) {
      content += `**Search results for: "${search}"** (${filteredPlugins.length} found)\n\n`;
    } else {
      content += `**All Plugins** (Page ${page + 1}/${totalPages})\n\n`;
    }

    pagePlugins.forEach((plugin, index) => {
      content += formatPluginLine(plugin);
      if (index < pagePlugins.length - 1) content += '\n\n';
    });

    if (isSupported) {
      content += '\n​\n-# hold this message (not the links) to install';
    }

    const row = buildPaginationRow(page, totalPages, !!search);
    await interaction.update({ content, components: [row] });
    
    } catch (err) {
    console.error('Error in handleButton:', err);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('plugins')
    .setDescription('Browse Aliucord plugins')
    .addStringOption(option =>
      option.setName('search')
        .setDescription('Search for plugins by name, description, or author')
        .setRequired(false)
        .setAutocomplete(true))
    .addBooleanOption(option =>
      option.setName('send')
        .setDescription('Send publicly or privately (default: private)')
        .setRequired(false)),

  async execute(interaction) {
    const send = interaction.options.getBoolean('send') ?? false;
    const deferOptions = send ? {} : { flags: MessageFlags.Ephemeral };
    await interaction.deferReply(deferOptions);

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
    const isSupported = isChannelSupported(interaction.channelId);
    if (search) {
      content += `**Search results for: "${search}"** (${filteredPlugins.length} found)\n\n`;
    } else {
      content += `**All Plugins** (Page ${page + 1}/${totalPages})\n\n`;
    }

    pagePlugins.forEach((plugin, index) => {
      content += formatPluginLine(plugin);
      if (index < pagePlugins.length - 1) content += '\n\n';
    });

    if (isSupported) {
      content += '\n​\n-# hold this message (not the links) to install';
    }

    const row = buildPaginationRow(page, totalPages, !!search);
    await interaction.editReply({ content, components: [row] });
    
    if (!isSupported) {
      try {
        const msg = await interaction.followUp({
          content: 'Use command in <#847566769258233926> for hold-to-install feature'
        });
        setTimeout(() => msg.delete().catch(() => {}), 30000);
      } catch (err) {
        console.error('Error sending info message:', err);
      }
    }
  },

  async executePrefix(message, args) {
    const search = args.join(' ').trim() || null;

    const allPlugins = await fetchPlugins();
    const filteredPlugins = search ? filterPlugins(allPlugins, search) : allPlugins;

    if (filteredPlugins.length === 0) {
      await message.reply('No plugins found.');
      return;
    }

    const page = 0;
    const totalPages = Math.ceil(filteredPlugins.length / PLUGINS_PER_PAGE);
    const start = page * PLUGINS_PER_PAGE;
    const pagePlugins = filteredPlugins.slice(start, start + PLUGINS_PER_PAGE);

    let content = '';
    const isSupported = isChannelSupported(message.channelId);
    if (search) {
      content += `**Search results for: "${search}"** (${filteredPlugins.length} found)\n\n`;
    } else {
      content += `**All Plugins** (Page ${page + 1}/${totalPages})\n\n`;
    }

    pagePlugins.forEach((plugin, index) => {
      content += formatPluginLine(plugin);
      if (index < pagePlugins.length - 1) content += '\n\n';
    });

    if (isSupported) {
      content += '\n​\n-# hold this message (not the links) to install';
    }

    const row = buildPaginationRow(page, totalPages, !!search);
    const replyOptions = { content, components: [row] };
    
    const reply = await message.reply(replyOptions);
    
    if (!isSupported) {
      try {
        const msg = await message.reply({
          content: 'Use command in <#847566769258233926> for hold-to-install feature'
        });
        setTimeout(() => msg.delete().catch(() => {}), 10000);
      } catch (err) {
        console.error('Error sending info message:', err);
      }
    }
  },

  async autocomplete(interaction) {
    try {
      const focusedValue = interaction.options.getFocused();
      if (!focusedValue) {
        await interaction.respond([]);
        return;
      }

      const allPlugins = await fetchPlugins();
      const searchLower = focusedValue.toLowerCase();
      
      const matches = allPlugins
        .filter(p => p.name.toLowerCase().includes(searchLower))
        .slice(0, 25)
        .map(plugin => ({
          name: plugin.name,
          value: plugin.name
        }));
      
      await interaction.respond(matches);
    } catch (err) {
      console.error('Error in autocomplete:', err);
      await interaction.respond([]).catch(() => {});
    }
  },

  handleButton,
  fetchPlugins,
  filterPlugins,
  initializePluginCache,
  clearPluginCache
};

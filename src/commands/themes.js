const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getConfigByGuildId } = require('../utils/serverConfig');

const THEMES_PER_PAGE = 5;

let cachedThemes = [];
let cacheTimestamp = 0;
let previewCache = new Map();
let previewCacheTimestamp = 0;
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours
const PREVIEW_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

let discordClient = null;

function setClient(client) {
  discordClient = client;
}

function clearThemeCache() {
  cachedThemes = [];
  cacheTimestamp = 0;
}

function clearPreviewCache() {
  previewCache = new Map();
  previewCacheTimestamp = 0;
}

function normalizeUrlForMatching(url) {
  // First decode any URL-encoded characters for consistent matching
  let normalized;
  try {
    normalized = decodeURIComponent(url);
  } catch {
    normalized = url;
  }
  
  normalized = normalized.toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  
  if (normalized.includes('cdn.statically.io/gh/')) {
    normalized = normalized
      .replace('cdn.statically.io/gh/', 'raw.githubusercontent.com/')
      .replace(/\/main\//, '/refs/heads/main/')
      .replace(/\/master\//, '/refs/heads/master/');
  }
  
  if (normalized.includes('cdn.statically.io/gl/')) {
    const match = normalized.match(/cdn\.statically\.io\/gl\/([^/]+)\/([^/]+)\/([^/]+)\/(.*)/);
    if (match) {
      const [, user, repo, branch, path] = match;
      normalized = `gitlab.com/${user}/${repo}/-/raw/${branch}/${path}`;
    }
  }
  
  normalized = normalized
    .replace('/refs/heads/', '/')
    .replace('raw.githubusercontent.com/', '')
    .replace('github.com/', '')
    .replace('/raw/', '/');
  
  return normalized;
}

async function fetchPreviewsFromChannel(guildId) {
  const now = Date.now();
  if (previewCache.size > 0 && (now - previewCacheTimestamp) < PREVIEW_CACHE_DURATION) {
    return previewCache;
  }

  if (!discordClient) {
    console.log('Discord client not available for fetching previews');
    return previewCache;
  }

  try {
    const config = getConfigByGuildId(guildId);
    if (!config.themesChannelId) {
      console.log(`No preview channel configured for guild ${guildId}`);
      return previewCache;
    }
    
    const channel = await discordClient.channels.fetch(config.themesChannelId).catch(() => null);
    if (!channel) {
      console.log('Could not fetch themes channel');
      return previewCache;
    }

    console.log('Fetching theme previews from #themes channel...');
    const newPreviewCache = new Map();
    let lastMessageId = null;
    let totalFetched = 0;
    const maxMessages = 1000;

    while (totalFetched < maxMessages) {
      const options = { limit: 100 };
      if (lastMessageId) {
        options.before = lastMessageId;
      }

      const messages = await channel.messages.fetch(options);
      if (messages.size === 0) break;

      for (const message of messages.values()) {
        const imageAttachments = message.attachments.filter(att => 
          att.contentType?.startsWith('image/') || 
          /\.(png|jpg|jpeg|gif|webp)$/i.test(att.name || '')
        );

        if (imageAttachments.size > 0) {
          const content = message.content || '';
          
          // Extract URLs more robustly - handle both encoded and unencoded URLs
          const urlMatches = content.match(/https?:\/\/[^\s<>"[\]]+/gi) || [];
          
          for (const rawUrl of urlMatches) {
            // Decode URL and check if it ends with .json
            let decodedUrl;
            try {
              decodedUrl = decodeURIComponent(rawUrl);
            } catch {
              decodedUrl = rawUrl;
            }
            
            if (decodedUrl.toLowerCase().endsWith('.json') || rawUrl.toLowerCase().endsWith('.json')) {
              const normalizedUrl = normalizeUrlForMatching(rawUrl);
              // Use Discord CDN URL directly instead of re-uploading
              const discordUrl = imageAttachments.first().url;
              newPreviewCache.set(normalizedUrl, discordUrl);
            }
          }
        }
      }

      totalFetched += messages.size;
      lastMessageId = messages.last().id;
      
      if (messages.size < 100) break;
    }

    previewCache = newPreviewCache;
    previewCacheTimestamp = now;
    console.log(`Cached ${newPreviewCache.size} theme previews from ${totalFetched} messages`);
    return previewCache;
  } catch (err) {
    console.error('Error fetching theme previews:', err);
    return previewCache;
  }
}

function getPreviewForTheme(theme) {
  const normalizedThemeUrl = normalizeUrlForMatching(theme.url);
  
  if (previewCache.has(normalizedThemeUrl)) {
    return previewCache.get(normalizedThemeUrl);
  }
  
  for (const [cachedUrl, previewUrl] of previewCache.entries()) {
    if (cachedUrl.includes(normalizedThemeUrl) || normalizedThemeUrl.includes(cachedUrl)) {
      return previewUrl;
    }
    
    const themeFilename = theme.filename?.toLowerCase() || '';
    if (themeFilename && cachedUrl.endsWith(themeFilename)) {
      return previewUrl;
    }
  }
  
  return null;
}

function normalizeThemeUrl(url) {
  // Decode URL first for consistent handling
  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    decodedUrl = url;
  }
  
  if (decodedUrl.includes("cdn.statically.io/gh/")) {
    return decodedUrl
      .replace("cdn.statically.io/gh/", "raw.githubusercontent.com/")
      .replace("/main/", "/refs/heads/main/")
      .replace("/master/", "/refs/heads/master/");
  }
  
  if (decodedUrl.includes("cdn.statically.io/gl/")) {
    const match = decodedUrl.match(/cdn\.statically\.io\/gl\/([^/]+)\/([^/]+)\/([^/]+)\/(.*)/);
    if (match) {
      const [, user, repo, branch, path] = match;
      return `https://gitlab.com/${user}/${repo}/-/raw/${branch}/${path}`;
    }
  }
  
  return decodedUrl;
}

async function fetchThemes(guildId) {
  const now = Date.now();
  if (cachedThemes.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedThemes;
  }

  try {
    const config = getConfigByGuildId(guildId);
    const THEMES_URL = config.themes.url;
    const response = await fetch(THEMES_URL);
    if (!response.ok) {
      console.error(`Error fetching themes: HTTP ${response.status}`);
      return cachedThemes.length > 0 ? cachedThemes : [];
    }

    const data = await response.json();
    const themes = [];

    if (Array.isArray(data)) {
      for (const theme of data) {
        if (theme.name && theme.url) {
          const normalizedUrl = normalizeThemeUrl(theme.url);
          themes.push({
            name: theme.name,
            version: theme.version || '',
            author: theme.author || 'Unknown',
            url: normalizedUrl,
            repoUrl: theme.repoUrl || '',
            filename: theme.filename || ''
          });
        }
      }
    }

    cachedThemes = themes;
    cacheTimestamp = now;
    console.log(`Fetched ${themes.length} themes from server ${guildId}`);
    return themes;
  } catch (err) {
    console.error('Error fetching themes:', err);
    return cachedThemes.length > 0 ? cachedThemes : [];
  }
}

async function initializeThemeCache(guildId) {
  console.log('Initializing theme cache...');
  await fetchThemes(guildId);
  await fetchPreviewsFromChannel(guildId);
}

function filterThemes(themes, search, author) {
  let filtered = themes;
  
  if (author) {
    const authorLower = author.toLowerCase();
    filtered = filtered.filter(theme => 
      theme.author.toLowerCase().includes(authorLower)
    );
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(theme => 
      theme.name.toLowerCase().includes(searchLower)
    );
  }
  
  return filtered;
}

function escapeMarkdown(text) {
  return text.replace(/(?:([#*_\-\[\]()!<>`~\\|:])|(^\s*\d+)(\.\s))/gm, '$2\\$1$3');
}

function escapeMarkdownLink(text) {
  return text.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

function cleanThemeName(name) {
  // Remove parentheses from display name
  return name.replace(/[()]/g, '').trim();
}

function formatUrlForMarkdown(url) {
  // Decode first to avoid double-encoding
  let decoded;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    decoded = url;
  }
  
  // Encode problematic characters: brackets, parentheses, angle brackets, whitespace
  return decoded.replace(/[\[\]()<>\s]/g, match => encodeURIComponent(match));
}

function formatThemeLine(theme) {
  // Clean parentheses from display name, escape brackets
  const cleanedName = cleanThemeName(theme.name);
  const safeName = escapeMarkdownLink(cleanedName);
  const formattedUrl = formatUrlForMarkdown(theme.url);
  
  let text = `[${safeName}](<${formattedUrl}>)`;
  
  // Use -# for smaller text on version and author only (no preview embeds)
  let smallText = '';
  if (theme.version) {
    smallText += `v${escapeMarkdown(theme.version)} `;
  }
  smallText += `by ${escapeMarkdown(theme.author)}`;
  
  text += `\n-# ${smallText}`;
  
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

function buildPaginationRow(page, totalPages, search = null, author = null) {
  const row = new ActionRowBuilder();
  const encodedSearch = encodeFilter(search || '');
  const encodedAuthor = encodeFilter(author || '');
  
  const prevBtn = new ButtonBuilder()
    .setCustomId(`themes_prev_${page}_${encodedSearch}_${encodedAuthor}`)
    .setLabel('Previous')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(page === 0);
  
  const nextBtn = new ButtonBuilder()
    .setCustomId(`themes_next_${page}_${encodedSearch}_${encodedAuthor}`)
    .setLabel('Next')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(page === totalPages - 1);
  
  row.addComponents(prevBtn, nextBtn);
  return row;
}

async function handleButton(interaction, action, page, encodedSearch, encodedAuthor) {
  try {
    const search = decodeFilter(encodedSearch);
    const author = decodeFilter(encodedAuthor);
    const allThemes = await fetchThemes(interaction.guildId);
    const filteredThemes = filterThemes(allThemes, search, author);

    page = parseInt(page);
    
    if (action === 'next') page++;
    if (action === 'prev') page--;

    const totalPages = Math.ceil(filteredThemes.length / THEMES_PER_PAGE);
    if (page < 0 || page >= totalPages) {
      return await interaction.update({ content: 'Invalid page.', components: [] });
    }

    const start = page * THEMES_PER_PAGE;
    const pageThemes = filteredThemes.slice(start, start + THEMES_PER_PAGE);

    let content = '';
    const hasFilter = search || author;
    if (hasFilter) {
      let filterText = [];
      if (search) filterText.push(`"${search}"`);
      if (author) filterText.push(`by ${author}`);
      content += `**Themes ${filterText.join(' ')}** (${filteredThemes.length} found)\n\n`;
    } else {
      content += `**All Themes** (Page ${page + 1}/${totalPages})\n\n`;
    }

    pageThemes.forEach((theme, index) => {
      content += formatThemeLine(theme);
      if (index < pageThemes.length - 1) content += '\n\n───────────────\n\n';
    });

    content += '\n​\n-# hold this message (not the links) to install';

    const row = buildPaginationRow(page, totalPages, search, author);
    await interaction.update({ content, components: [row] });
    
  } catch (err) {
    console.error('Error in handleButton:', err);
  }
}

function getUniqueAuthors(themes) {
  const authorsSet = new Set();
  themes.forEach(t => {
    if (t.author && t.author !== 'Unknown') {
      authorsSet.add(t.author.trim());
    }
  });
  return Array.from(authorsSet).sort();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('themes')
    .setDescription('Browse Aliucord themes')
    .addStringOption(option =>
      option.setName('search')
        .setDescription('Search for themes by name')
        .setRequired(false)
        .setAutocomplete(true))
    .addStringOption(option =>
      option.setName('author')
        .setDescription('Filter themes by author')
        .setRequired(false)
        .setAutocomplete(true))
    .addBooleanOption(option =>
      option.setName('send')
        .setDescription('Send publicly or privately (default: private)')
        .setRequired(false)),

  async execute(interaction) {
    setClient(interaction.client);
    
    const send = interaction.options.getBoolean('send') ?? false;
    const deferOptions = send ? {} : { flags: MessageFlags.Ephemeral };
    await interaction.deferReply(deferOptions);

    const search = interaction.options.getString('search');
    const author = interaction.options.getString('author');
    const allThemes = await fetchThemes(interaction.guildId);
    const filteredThemes = filterThemes(allThemes, search, author);

    if (filteredThemes.length === 0) {
      return interaction.editReply('No themes found.');
    }

    if (previewCache.size === 0) {
      await fetchPreviewsFromChannel(interaction.guildId);
    }

    const page = 0;
    const totalPages = Math.ceil(filteredThemes.length / THEMES_PER_PAGE);
    const start = page * THEMES_PER_PAGE;
    const pageThemes = filteredThemes.slice(start, start + THEMES_PER_PAGE);

    let content = '';
    const hasFilter = search || author;
    if (hasFilter) {
      let filterText = [];
      if (search) filterText.push(`"${search}"`);
      if (author) filterText.push(`by ${author}`);
      content += `**Themes ${filterText.join(' ')}** (${filteredThemes.length} found)\n\n`;
    } else {
      content += `**All Themes** (Page ${page + 1}/${totalPages})\n\n`;
    }

    pageThemes.forEach((theme, index) => {
      content += formatThemeLine(theme);
      if (index < pageThemes.length - 1) content += '\n\n───────────────\n\n';
    });

    content += '\n​\n-# hold this message (not the links) to install';

    const row = buildPaginationRow(page, totalPages, search, author);
    await interaction.editReply({ content, components: [row] });
  },

  async executePrefix(message, args) {
    setClient(message.client);
    
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

    const allThemes = await fetchThemes(message.guildId);
    const filteredThemes = filterThemes(allThemes, search, author);

    if (filteredThemes.length === 0) {
      await message.reply('No themes found.');
      return;
    }

    if (previewCache.size === 0) {
      await fetchPreviewsFromChannel(message.guildId);
    }

    const page = 0;
    const totalPages = Math.ceil(filteredThemes.length / THEMES_PER_PAGE);
    const start = page * THEMES_PER_PAGE;
    const pageThemes = filteredThemes.slice(start, start + THEMES_PER_PAGE);

    let content = '';
    const hasFilter = search || author;
    if (hasFilter) {
      let filterText = [];
      if (search) filterText.push(`"${search}"`);
      if (author) filterText.push(`by ${author}`);
      content += `**Themes ${filterText.join(' ')}** (${filteredThemes.length} found)\n\n`;
    } else {
      content += `**All Themes** (Page ${page + 1}/${totalPages})\n\n`;
    }

    pageThemes.forEach((theme, index) => {
      content += formatThemeLine(theme);
      if (index < pageThemes.length - 1) content += '\n\n───────────────\n\n';
    });

    content += '\n​\n-# hold this message (not the links) to install';

    const row = buildPaginationRow(page, totalPages, search, author);
    await message.reply({ content, components: [row] });
  },

  async autocomplete(interaction) {
    try {
      const focusedOption = interaction.options.getFocused(true);
      const focusedValue = focusedOption.value;
      
      if (!focusedValue) {
        await interaction.respond([]);
        return;
      }

      const allThemes = await fetchThemes(interaction.guildId);
      const searchLower = focusedValue.toLowerCase();
      
      if (focusedOption.name === 'author') {
        const authors = getUniqueAuthors(allThemes);
        const matches = authors
          .filter(author => author.toLowerCase().includes(searchLower))
          .slice(0, 25)
          .map(author => ({
            name: author,
            value: author
          }));
        await interaction.respond(matches);
      } else {
        const matches = allThemes
          .filter(t => t.name.toLowerCase().includes(searchLower))
          .slice(0, 25)
          .map(theme => ({
            name: theme.name,
            value: theme.name
          }));
        await interaction.respond(matches);
      }
    } catch (err) {
      console.error('Error in autocomplete:', err);
      await interaction.respond([]).catch(() => {});
    }
  },

  handleButton,
  fetchThemes,
  filterThemes,
  initializeThemeCache,
  clearThemeCache,
  setClient
};

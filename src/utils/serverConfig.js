// Server configuration for different Discord servers
const SERVER_CONFIGS = {
  ALIUCORD: {
    guildId: '811255666990907402',
    plugins: {
      url: 'https://plugins.aliucord.com/manifest.json',
      isJsonArray: true
    },
    themes: {
      url: 'https://rautobot.github.io/themes-repo/data.json',
      isJsonArray: true
    },
    themesChannelId: '824357609778708580'
  },
  KETTU: {
    guildId: '1368145952266911755',
    plugins: {
      url: 'https://raw.githubusercontent.com/Purple-EyeZ/Plugins-List/refs/heads/main/src/plugins-data.json',
      isJsonArray: true
    },
    themes: {
      url: 'https://raw.githubusercontent.com/kmmiio99o/theme-marketplace/refs/heads/main/themes.json',
      isJsonArray: true
    },
    themesChannelId: null // Kettu doesn't have preview images
  }
};

function getConfigByGuildId(guildId) {
  for (const config of Object.values(SERVER_CONFIGS)) {
    if (config.guildId === guildId) {
      return config;
    }
  }
  // Default to Aliucord
  return SERVER_CONFIGS.ALIUCORD;
}

function getConfigByName(name) {
  return SERVER_CONFIGS[name] || SERVER_CONFIGS.ALIUCORD;
}

module.exports = {
  SERVER_CONFIGS,
  getConfigByGuildId,
  getConfigByName
};

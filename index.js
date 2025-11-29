const { Client, GatewayIntentBits } = require('discord.js');

const TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!TOKEN) {
  console.error('Error: DISCORD_BOT_TOKEN environment variable is not set');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    activities: [],
    status: 'online'
  });

  console.log("BotGhost status removed!");
});

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

client.login(TOKEN);

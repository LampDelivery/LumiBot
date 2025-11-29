const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Partials, AttachmentBuilder } = require('discord.js');
const express = require('express');
const { Pool } = require('pg');

const TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!TOKEN) {
  console.error('Error: DISCORD_BOT_TOKEN environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

const responders = {};
const minkyIntervals = {};

async function loadAutoresponders() {
  try {
    const result = await pool.query('SELECT * FROM autoresponders');
    for (const row of result.rows) {
      if (!responders[row.guild_id]) responders[row.guild_id] = [];
      responders[row.guild_id].push({
        trigger: row.trigger_phrase,
        response: row.response,
        channelId: row.channel_id
      });
    }
    console.log(`Loaded ${result.rows.length} autoresponders from database`);
  } catch (err) {
    console.error('Error loading autoresponders:', err);
  }
}

async function saveAutoresponder(guildId, trigger, response, channelId) {
  try {
    await pool.query(
      'INSERT INTO autoresponders (guild_id, trigger_phrase, response, channel_id) VALUES ($1, $2, $3, $4) ON CONFLICT (guild_id, trigger_phrase, channel_id) DO UPDATE SET response = $3',
      [guildId, trigger, response, channelId]
    );
  } catch (err) {
    console.error('Error saving autoresponder:', err);
  }
}

async function deleteAutoresponderFromDb(guildId, trigger, channelId) {
  try {
    if (channelId) {
      await pool.query(
        'DELETE FROM autoresponders WHERE guild_id = $1 AND trigger_phrase = $2 AND channel_id = $3',
        [guildId, trigger, channelId]
      );
    } else {
      await pool.query(
        'DELETE FROM autoresponders WHERE guild_id = $1 AND trigger_phrase = $2 AND channel_id IS NULL',
        [guildId, trigger]
      );
    }
  } catch (err) {
    console.error('Error deleting autoresponder:', err);
  }
}

async function loadMinkyIntervals() {
  try {
    const result = await pool.query('SELECT * FROM minky_intervals');
    for (const row of result.rows) {
      const channel = await client.channels.fetch(row.channel_id).catch(() => null);
      if (channel) {
        const key = `${row.guild_id}-${row.channel_id}`;
        const timer = setInterval(() => sendMinkyToChannel(channel), row.interval_ms);
        minkyIntervals[key] = {
          timer,
          interval: row.interval_str,
          channelId: row.channel_id,
          guildId: row.guild_id
        };
      }
    }
    console.log(`Loaded ${result.rows.length} minky intervals from database`);
  } catch (err) {
    console.error('Error loading minky intervals:', err);
  }
}

async function saveMinkyInterval(guildId, channelId, intervalStr, intervalMs) {
  try {
    await pool.query(
      'INSERT INTO minky_intervals (guild_id, channel_id, interval_str, interval_ms) VALUES ($1, $2, $3, $4) ON CONFLICT (guild_id, channel_id) DO UPDATE SET interval_str = $3, interval_ms = $4',
      [guildId, channelId, intervalStr, intervalMs]
    );
  } catch (err) {
    console.error('Error saving minky interval:', err);
  }
}

async function deleteMinkyIntervalFromDb(guildId, channelId) {
  try {
    await pool.query(
      'DELETE FROM minky_intervals WHERE guild_id = $1 AND channel_id = $2',
      [guildId, channelId]
    );
  } catch (err) {
    console.error('Error deleting minky interval:', err);
  }
}

function parseInterval(intervalStr) {
  const match = intervalStr.match(/^(\d+)(m|h|d)$/i);
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  const multipliers = {
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000
  };
  
  return value * multipliers[unit];
}

async function sendMinkyToChannel(channel) {
  try {
    const response = await fetch(`https://minky.materii.dev?cb=${Date.now()}`);
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'minky.jpg' });
    
    await channel.send({
      content: "Here's a random Minky 🐱",
      files: [attachment]
    });
  } catch (err) {
    console.error('Failed to send scheduled Minky:', err);
  }
}

client.once('clientReady', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    activities: [],
    status: 'online'
  });

  console.log("BotGhost status removed!");

  const commands = [
    new SlashCommandBuilder()
      .setName('minky')
      .setDescription('Get a random Minky cat image'),
    new SlashCommandBuilder()
      .setName('minkyinterval')
      .setDescription('Schedule automatic Minky images at a set interval')
      .addStringOption(option =>
        option.setName('interval')
          .setDescription('Time interval (e.g., 30m, 1h, 6h, 1d)')
          .setRequired(true))
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('Channel to send Minky images to')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)),
    new SlashCommandBuilder()
      .setName('stopminky')
      .setDescription('Stop scheduled Minky images for a channel')
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('Channel to stop Minky images in')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)),
    new SlashCommandBuilder()
      .setName('addresponder')
      .setDescription('Add a new autoresponder')
      .addStringOption(option =>
        option.setName('trigger')
          .setDescription('Trigger phrase')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('response')
          .setDescription('Response message')
          .setRequired(true))
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('Optional channel restriction')
          .setRequired(false)),
    new SlashCommandBuilder()
      .setName('deleteresponder')
      .setDescription('Delete an autoresponder')
      .addStringOption(option =>
        option.setName('trigger')
          .setDescription('Trigger phrase to delete')
          .setRequired(true)),
    new SlashCommandBuilder()
      .setName('install')
      .setDescription('Get Kettu installation instructions')
  ];

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Slash commands registered!');
  } catch (error) {
    console.error('Error registering commands:', error);
  }

  await loadAutoresponders();
  await loadMinkyIntervals();
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === 'install_android') {
      await interaction.reply({
        embeds: [{
          title: 'Android Installation',
          description: '**Choose your method:**\n\n' +
            '**Root with Xposed** → [KettuXposed](https://github.com/C0C0B01/KettuXposed/releases/latest)\n\n' +
            '**Non-root** → [KettuManager](https://github.com/C0C0B01/KettuManager/releases/latest)\n\n' +
            '*If you don\'t know what root is, go with KettuManager*',
          color: 0x3DDC84
        }],
        ephemeral: true
      });
      return;
    }

    if (interaction.customId === 'install_ios') {
      await interaction.reply({
        embeds: [{
          title: 'iOS Installation',
          description: '**Choose your method:**\n\n' +
            '**Jailbroken** → [KettuTweak](https://github.com/C0C0B01/KettuTweak)\n\n' +
            '**Jailed** → [BTLoader](https://github.com/CloudySn0w/BTLoader)\n\n' +
            '*If you don\'t know what jailbreak is, go with BTLoader*',
          color: 0x007AFF
        }],
        ephemeral: true
      });
      return;
    }
  }

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'install') {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('install_android')
          .setLabel('Android')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('install_ios')
          .setLabel('iOS')
          .setStyle(ButtonStyle.Primary)
      );

    await interaction.reply({
      embeds: [{
        title: 'Kettu Installation',
        description: 'Select your platform to get installation instructions:',
        color: 0x5865F2
      }],
      components: [row],
      ephemeral: true
    });
    return;
  }

  if (interaction.commandName === 'minky') {
    try {
      const response = await fetch(`https://minky.materii.dev?cb=${Date.now()}`);
      const imageBuffer = Buffer.from(await response.arrayBuffer());
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'minky.jpg' });

      await interaction.reply({
        content: "Here's a random Minky 🐱",
        files: [attachment]
      });
    } catch (err) {
      console.error(err);
      await interaction.reply('❌ Failed to fetch Minky image.');
    }
  }

  if (interaction.commandName === 'minkyinterval') {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        content: '❌ You need Administrator permissions to use this command.',
        ephemeral: true
      });
    }

    const intervalStr = interaction.options.getString('interval');
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guildId;
    const key = `${guildId}-${channel.id}`;

    const intervalMs = parseInterval(intervalStr);
    if (!intervalMs) {
      return interaction.reply({
        content: '❌ Invalid interval format. Use format like: 30m, 1h, 6h, 1d',
        ephemeral: true
      });
    }

    if (intervalMs < 5 * 60 * 1000) {
      return interaction.reply({
        content: '❌ Minimum interval is 5 minutes (5m).',
        ephemeral: true
      });
    }

    if (minkyIntervals[key]) {
      clearInterval(minkyIntervals[key].timer);
    }

    const timer = setInterval(() => sendMinkyToChannel(channel), intervalMs);
    minkyIntervals[key] = {
      timer,
      interval: intervalStr,
      channelId: channel.id,
      guildId
    };

    await saveMinkyInterval(guildId, channel.id, intervalStr, intervalMs);

    const units = { m: 'minute(s)', h: 'hour(s)', d: 'day(s)' };
    const match = intervalStr.match(/^(\d+)(m|h|d)$/i);
    const displayInterval = `${match[1]} ${units[match[2].toLowerCase()]}`;

    await interaction.reply(`✅ Minky images will be sent to ${channel} every ${displayInterval}! Sending the first one now...`);
    
    await sendMinkyToChannel(channel);
  }

  if (interaction.commandName === 'stopminky') {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        content: '❌ You need Administrator permissions to use this command.',
        ephemeral: true
      });
    }

    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guildId;
    const key = `${guildId}-${channel.id}`;

    if (!minkyIntervals[key]) {
      return interaction.reply({
        content: `❌ No scheduled Minky images found for ${channel}.`,
        ephemeral: true
      });
    }

    clearInterval(minkyIntervals[key].timer);
    delete minkyIntervals[key];
    await deleteMinkyIntervalFromDb(guildId, channel.id);

    await interaction.reply(`✅ Stopped scheduled Minky images for ${channel}.`);
  }

  if (interaction.commandName === 'addresponder') {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        content: '❌ You need Administrator permissions to use this command.',
        ephemeral: true
      });
    }

    const guildId = interaction.guildId;
    if (!responders[guildId]) responders[guildId] = [];

    const trigger = interaction.options.getString('trigger').toLowerCase();
    const response = interaction.options.getString('response');
    const channel = interaction.options.getChannel('channel');

    const channelId = channel?.id || null;
    const existingIndex = responders[guildId].findIndex(r => r.trigger === trigger && r.channelId === channelId);
    if (existingIndex !== -1) {
      return interaction.reply({
        content: `❌ An autoresponder with trigger "${trigger}"${channel ? ` in ${channel}` : ''} already exists. Delete it first to replace it.`,
        ephemeral: true
      });
    }

    responders[guildId].push({
      trigger,
      response,
      channelId
    });

    await saveAutoresponder(guildId, trigger, response, channelId);

    await interaction.reply(`✅ Autoresponder added for trigger: "${trigger}"${channel ? ` in ${channel}` : ''}`);
  }

  if (interaction.commandName === 'deleteresponder') {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        content: '❌ You need Administrator permissions to use this command.',
        ephemeral: true
      });
    }

    const guildId = interaction.guildId;
    const trigger = interaction.options.getString('trigger').toLowerCase();
    
    if (!responders[guildId] || responders[guildId].length === 0) {
      return interaction.reply({
        content: '❌ No autoresponders exist for this server.',
        ephemeral: true
      });
    }

    const index = responders[guildId].findIndex(r => r.trigger === trigger);
    
    if (index === -1) {
      return interaction.reply({
        content: `❌ No autoresponder found with trigger: "${trigger}"`,
        ephemeral: true
      });
    }

    const deletedResponder = responders[guildId][index];
    responders[guildId].splice(index, 1);
    await deleteAutoresponderFromDb(guildId, trigger, deletedResponder.channelId);
    await interaction.reply(`✅ Autoresponder deleted for trigger: "${trigger}"`);
  }
});

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (!message.guild) {
    await sendMinkyToChannel(message.channel);
    return;
  }

  const guildResponders = responders[message.guild.id] || [];

  for (const r of guildResponders) {
    const matches = message.content.toLowerCase().includes(r.trigger);
    const channelMatch = !r.channelId || message.channel.id === r.channelId;

    if (matches && channelMatch) {
      await message.reply(r.response);
      return;
    }
  }
});

client.login(TOKEN);

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot is alive!'));

app.listen(PORT, () => console.log(`Webserver running on port ${PORT}`));

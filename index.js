const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');

const TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!TOKEN) {
  console.error('Error: DISCORD_BOT_TOKEN environment variable is not set');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const responders = {};

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
      const imageUrl = `https://minky.materii.dev?cb=${Date.now()}`;

      await interaction.reply({
        embeds: [{
          title: "Here's a random Minky 🐱",
          image: { url: imageUrl },
          color: 0xFFC0CB
        }]
      });
    } catch (err) {
      console.error(err);
      await interaction.reply('❌ Failed to fetch Minky image.');
    }
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

    responders[guildId].push({
      trigger,
      response,
      channelId: channel?.id || null
    });

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

    responders[guildId].splice(index, 1);
    await interaction.reply(`✅ Autoresponder deleted for trigger: "${trigger}"`);
  }
});

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

client.on('messageCreate', (message) => {
  if (message.author.bot || !message.guild) return;

  const guildResponders = responders[message.guild.id] || [];

  for (const r of guildResponders) {
    const matches = message.content.toLowerCase().includes(r.trigger);
    const channelMatch = !r.channelId || message.channel.id === r.channelId;

    if (matches && channelMatch) {
      message.reply(r.response);
      break;
    }
  }
});

client.login(TOKEN);

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot is alive!'));

app.listen(PORT, () => console.log(`Webserver running on port ${PORT}`));

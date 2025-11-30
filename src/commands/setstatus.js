const { SlashCommandBuilder, ActivityType } = require('discord.js');
const { saveBotStatus } = require('../utils/database');

const OWNER_ID = process.env.DISCORD_OWNER_ID;

const activityTypes = {
  playing: ActivityType.Playing,
  streaming: ActivityType.Streaming,
  listening: ActivityType.Listening,
  watching: ActivityType.Watching,
  competing: ActivityType.Competing
};

const activityTypeNames = {
  playing: 'Playing',
  streaming: 'Streaming',
  listening: 'Listening to',
  watching: 'Watching',
  competing: 'Competing in'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstatus')
    .setDescription('Set bot status (Owner only)')
    .addStringOption(option =>
      option.setName('status')
        .setDescription('Bot status')
        .addChoices(
          { name: 'Online', value: 'online' },
          { name: 'Idle', value: 'idle' },
          { name: 'Do Not Disturb', value: 'dnd' }
        )
        .setRequired(true))
    .addStringOption(option =>
      option.setName('activity')
        .setDescription('Activity type')
        .addChoices(
          { name: 'Playing', value: 'playing' },
          { name: 'Streaming', value: 'streaming' },
          { name: 'Listening', value: 'listening' },
          { name: 'Watching', value: 'watching' },
          { name: 'Competing', value: 'competing' }
        )
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Status message')
        .setRequired(true)),
  
  async execute(interaction) {
    if (!OWNER_ID || interaction.user.id !== OWNER_ID) {
      return interaction.reply({
        content: '❌ Only the bot owner can use this command.',
        ephemeral: true
      });
    }

    const status = interaction.options.getString('status');
    const activity = interaction.options.getString('activity');
    const message = interaction.options.getString('message');

    try {
      await interaction.client.user.setPresence({
        activities: [{ name: message, type: activityTypes[activity] }],
        status: status
      });

      await saveBotStatus(status, activity, message);

      await interaction.reply({
        content: `✅ Bot status updated to **${status}** - ${activityTypeNames[activity]} ${message}`,
        ephemeral: true
      });
    } catch (err) {
      console.error('Error setting bot status:', err);
      await interaction.reply({
        content: '❌ Failed to update bot status.',
        ephemeral: true
      });
    }
  },

  async executePrefix(message, args, rawArgs) {
    if (!OWNER_ID || message.author.id !== OWNER_ID) {
      return message.reply('❌ Only the bot owner can use this command.');
    }

    const validStatuses = ['online', 'idle', 'dnd'];
    const validActivities = ['playing', 'streaming', 'listening', 'watching', 'competing'];
    const status = args[0]?.toLowerCase();
    const activity = args[1]?.toLowerCase();
    const statusMessage = args.slice(2).join(' ');

    if (!status || !validStatuses.includes(status)) {
      return message.reply('❌ Usage: `l!setstatus <online|idle|dnd> <playing|streaming|listening|watching|competing> <message>`\nExample: `l!setstatus online listening Spotify`');
    }

    if (!activity || !validActivities.includes(activity)) {
      return message.reply('❌ Please provide a valid activity type: playing, streaming, listening, watching, competing\nExample: `l!setstatus online listening Spotify`');
    }

    if (!statusMessage) {
      return message.reply('❌ Please provide a status message.\nExample: `l!setstatus online listening Spotify`');
    }

    try {
      await message.client.user.setPresence({
        activities: [{ name: statusMessage, type: activityTypes[activity] }],
        status: status
      });

      await saveBotStatus(status, activity, statusMessage);

      await message.reply(`✅ Bot status updated to **${status}** - ${activityTypeNames[activity]} ${statusMessage}`);
    } catch (err) {
      console.error('Error setting bot status:', err);
      await message.reply('❌ Failed to update bot status.');
    }
  }
};

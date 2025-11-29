const { SlashCommandBuilder } = require('discord.js');

const OWNER_ID = process.env.DISCORD_OWNER_ID;

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
    const message = interaction.options.getString('message');

    try {
      await interaction.client.user.setPresence({
        activities: [{ name: message, type: 0 }],
        status: status
      });

      await interaction.reply({
        content: `✅ Bot status updated to **${status}** with message: "${message}"`,
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
    const status = args[0]?.toLowerCase();
    const statusMessage = rawArgs.slice(args[0]?.length || 0).trim();

    if (!status || !validStatuses.includes(status)) {
      return message.reply('❌ Usage: `l!setstatus <online|idle|dnd> <message>`\nExample: `l!setstatus online Playing games`');
    }

    if (!statusMessage) {
      return message.reply('❌ Please provide a status message.\nExample: `l!setstatus online Playing games`');
    }

    try {
      await message.client.user.setPresence({
        activities: [{ name: statusMessage, type: 0 }],
        status: status
      });

      await message.reply(`✅ Bot status updated to **${status}** with message: "${statusMessage}"`);
    } catch (err) {
      console.error('Error setting bot status:', err);
      await message.reply('❌ Failed to update bot status.');
    }
  }
};

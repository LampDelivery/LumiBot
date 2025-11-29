const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { minkyIntervals, deleteMinkyIntervalFromDb } = require('../utils/database');
const { findChannel } = require('../utils/prefixParser');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stopminky')
    .setDescription('Stop scheduled Minky images for a channel')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to stop Minky images in')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)),
  
  async execute(interaction) {
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
  },

  async executePrefix(message, args) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply('❌ You need Administrator permissions to use this command.');
    }

    if (args.length < 1) {
      return message.reply('❌ Usage: `l!stopminky <#channel>`\nExample: `l!stopminky #general`');
    }

    const channel = findChannel(message.guild, args[0]);
    
    if (!channel) {
      return message.reply('❌ Invalid channel. Mention a channel like `#general`.');
    }

    const guildId = message.guild.id;
    const key = `${guildId}-${channel.id}`;

    if (!minkyIntervals[key]) {
      return message.reply(`❌ No scheduled Minky images found for ${channel}.`);
    }

    clearInterval(minkyIntervals[key].timer);
    delete minkyIntervals[key];
    await deleteMinkyIntervalFromDb(guildId, channel.id);

    await message.reply(`✅ Stopped scheduled Minky images for ${channel}.`);
  }
};

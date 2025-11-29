const { SlashCommandBuilder } = require('discord.js');
const { responders, deleteAutoresponderFromDb } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deleteresponder')
    .setDescription('Delete an autoresponder')
    .addStringOption(option =>
      option.setName('trigger')
        .setDescription('Trigger phrase to delete')
        .setRequired(true)),
  
  async execute(interaction) {
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
  },

  async executePrefix(message, args, rawArgs) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply('❌ You need Administrator permissions to use this command.');
    }

    const trigger = rawArgs.trim().toLowerCase();
    
    if (!trigger) {
      return message.reply('❌ Usage: `l!deleteresponder <trigger>`\nExample: `l!deleteresponder hello`');
    }

    const guildId = message.guild.id;
    
    if (!responders[guildId] || responders[guildId].length === 0) {
      return message.reply('❌ No autoresponders exist for this server.');
    }

    const index = responders[guildId].findIndex(r => r.trigger === trigger);
    
    if (index === -1) {
      return message.reply(`❌ No autoresponder found with trigger: "${trigger}"`);
    }

    const deletedResponder = responders[guildId][index];
    responders[guildId].splice(index, 1);
    await deleteAutoresponderFromDb(guildId, trigger, deletedResponder.channelId);
    await message.reply(`✅ Autoresponder deleted for trigger: "${trigger}"`);
  }
};

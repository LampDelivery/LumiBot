const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { fetchPlugins } = require('./plugins');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('plugin-stats')
    .setDescription('View statistics about available plugins'),
  
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const allPlugins = await fetchPlugins();
      
      if (allPlugins.length === 0) {
        return interaction.editReply('No plugin data available.');
      }

      // Calculate stats
      const totalPlugins = allPlugins.length;
      const authorsSet = new Set(allPlugins.map(p => p.authors).filter(a => a && a !== 'Unknown'));
      const uniqueAuthors = authorsSet.size;
      
      // Count plugins with descriptions
      const withDescriptions = allPlugins.filter(p => p.description && p.description !== 'No description').length;
      
      // Find longest name
      const longestName = allPlugins.reduce((max, p) => p.name.length > max.length ? p.name : max, '');
      
      // Sample some recent/random plugins
      const samplePlugins = allPlugins.slice(0, 5).map(p => `• ${p.name}`).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📊 Plugin Statistics')
        .addFields(
          {
            name: 'Total Plugins',
            value: `**${totalPlugins}** plugins available`,
            inline: true
          },
          {
            name: 'Unique Authors',
            value: `**${uniqueAuthors}** authors`,
            inline: true
          },
          {
            name: 'Plugins with Descriptions',
            value: `**${withDescriptions}** (${Math.round((withDescriptions / totalPlugins) * 100)}%)`,
            inline: true
          },
          {
            name: 'Sample Plugins',
            value: samplePlugins || 'No plugins found',
            inline: false
          }
        )
        .setFooter({ text: 'Use /plugins to browse all plugins' });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Error in plugin-stats:', err);
      await interaction.editReply('❌ Failed to fetch plugin statistics.');
    }
  },

  async executePrefix(message) {
    try {
      const allPlugins = await fetchPlugins();
      
      if (allPlugins.length === 0) {
        return message.reply('No plugin data available.');
      }

      // Calculate stats
      const totalPlugins = allPlugins.length;
      const authorsSet = new Set(allPlugins.map(p => p.authors).filter(a => a && a !== 'Unknown'));
      const uniqueAuthors = authorsSet.size;
      
      // Count plugins with descriptions
      const withDescriptions = allPlugins.filter(p => p.description && p.description !== 'No description').length;
      
      // Sample some plugins
      const samplePlugins = allPlugins.slice(0, 5).map(p => `• ${p.name}`).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📊 Plugin Statistics')
        .addFields(
          {
            name: 'Total Plugins',
            value: `**${totalPlugins}** plugins available`,
            inline: true
          },
          {
            name: 'Unique Authors',
            value: `**${uniqueAuthors}** authors`,
            inline: true
          },
          {
            name: 'Plugins with Descriptions',
            value: `**${withDescriptions}** (${Math.round((withDescriptions / totalPlugins) * 100)}%)`,
            inline: true
          },
          {
            name: 'Sample Plugins',
            value: samplePlugins || 'No plugins found',
            inline: false
          }
        )
        .setFooter({ text: 'Use l!plugins to browse all plugins' });

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Error in plugin-stats prefix:', err);
      await message.reply('❌ Failed to fetch plugin statistics.');
    }
  }
};

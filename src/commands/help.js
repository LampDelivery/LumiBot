const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all available bot commands'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🤖 Aliucord Bot Commands')
      .setDescription('All available commands for the Aliucord community bot')
      .addFields(
        {
          name: '📚 Plugin Commands',
          value: '`/plugins [search]` - Browse all Aliucord plugins\n`/random-plugin` - Get a random plugin suggestion',
          inline: false
        },
        {
          name: '🐱 Fun Commands',
          value: '`/minky` - Get a random Minky cat image\n`/minkyinterval [interval]` - Auto-post Minky images (seconds, 0 to stop)',
          inline: false
        },
        {
          name: '⚙️ Server Commands',
          value: '`/autoresponder [action]` - Manage custom autoresponders',
          inline: false
        },
        {
          name: '📌 Prefix Commands',
          value: 'Use `l!` prefix for text-based versions of slash commands\n(e.g., `l!plugins`, `l!minky`, `l!help`)',
          inline: false
        },
        {
          name: '💡 Tips',
          value: '• Use `/plugins` in <#847566769258233926> to unlock "hold to install" feature',
          inline: false
        }
      );

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🤖 Aliucord Bot Commands')
      .setDescription('All available commands for the Aliucord community bot')
      .addFields(
        {
          name: '📚 Plugin Commands',
          value: '`/plugins [search]` - Browse all Aliucord plugins\n`/random-plugin` - Get a random plugin suggestion',
          inline: false
        },
        {
          name: '🐱 Fun Commands',
          value: '`/minky` - Get a random Minky cat image\n`/minkyinterval [interval]` - Auto-post Minky images (seconds, 0 to stop)',
          inline: false
        },
        {
          name: '⚙️ Server Commands',
          value: '`/autoresponder [action]` - Manage custom autoresponders',
          inline: false
        },
        {
          name: '📌 Prefix Commands',
          value: 'Use `l!` prefix for text-based versions of slash commands\n(e.g., `l!plugins`, `l!minky`, `l!help`)',
          inline: false
        },
        {
          name: '💡 Tips',
          value: '• Use `/plugins` in <#847566769258233926> to unlock "hold to install" feature',
          inline: false
        }
      );

    await message.reply({ embeds: [embed] });
  }
};

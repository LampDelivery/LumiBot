const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('minky')
    .setDescription('Get a random Minky cat image'),
  
  async execute(interaction) {
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
  },

  async executePrefix(message) {
    try {
      const response = await fetch(`https://minky.materii.dev?cb=${Date.now()}`);
      const imageBuffer = Buffer.from(await response.arrayBuffer());
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'minky.jpg' });

      await message.reply({
        content: "Here's a random Minky 🐱",
        files: [attachment]
      });
    } catch (err) {
      console.error(err);
      await message.reply('❌ Failed to fetch Minky image.');
    }
  }
};

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('install')
    .setDescription('Get installation instructions'),
  
  async execute(interaction) {
    const isAliucord = interaction.guildId === '811255666990907402';
    
    if (isAliucord) {
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('install_android')
            .setLabel('Android')
            .setStyle(ButtonStyle.Success)
        );

      await interaction.reply({
        embeds: [{
          title: 'Aliucord Installation',
          description: 'Select your platform to get installation instructions:',
          color: 0x5865F2
        }],
        components: [row],
        ephemeral: true
      });
    } else {
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
    }
  },

  async executePrefix(message, args) {
    const platform = args[0]?.toLowerCase();
    const isAliucord = message.guild.id === '811255666990907402';

    if (!platform) {
      if (isAliucord) {
        return message.reply({
          embeds: [{
            title: 'Aliucord Installation',
            description: 'Use `l!install android` for installation instructions.',
            color: 0x5865F2
          }]
        });
      } else {
        return message.reply({
          embeds: [{
            title: 'Kettu Installation',
            description: 'Use `l!install android` or `l!install ios` for installation instructions.',
            color: 0x5865F2
          }]
        });
      }
    }

    if (platform === 'android') {
      if (isAliucord) {
        await message.reply({
          embeds: [{
            title: 'Aliucord Installation',
            description: '**Download the Manager:**\n\n' +
              '[Aliucord Manager](https://github.com/Aliucord/Manager/releases/latest)\n\n' +
              '*Use the manager to install and manage Aliucord*',
            color: 0x3DDC84
          }]
        });
      } else {
        await message.reply({
          embeds: [{
            title: 'Android Installation',
            description: '**Choose your method:**\n\n' +
              '**Root with Xposed** → [KettuXposed](https://github.com/C0C0B01/KettuXposed/releases/latest)\n\n' +
              '**Non-root** → [KettuManager](https://github.com/C0C0B01/KettuManager/releases/latest)\n\n' +
              '*If you don\'t know what root is, go with KettuManager*',
            color: 0x3DDC84
          }]
        });
      }
    } else if (platform === 'ios' && !isAliucord) {
      await message.reply({
        embeds: [{
          title: 'iOS Installation',
          description: '**Choose your method:**\n\n' +
            '**Jailbroken** → [KettuTweak](https://github.com/C0C0B01/KettuTweak)\n\n' +
            '**Jailed** → [BTLoader](https://github.com/CloudySn0w/BTLoader)\n\n' +
            '*If you don\'t know what jailbreak is, go with BTLoader*',
          color: 0x007AFF
        }]
      });
    } else {
      await message.reply('❌ Invalid platform. Use `android`' + (isAliucord ? '' : ' or `ios`') + '.');
    }
  }
};

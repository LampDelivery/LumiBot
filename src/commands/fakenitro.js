const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const SUPPORTED_CHANNELS = [
  '811261298997460992',
  '847566769258233926',
  '811262084968742932'
];

function isChannelSupported(channelId) {
  return SUPPORTED_CHANNELS.includes(channelId);
}

const FAKENITRO_MESSAGE = `**"FAKENITRO" PLUGINS**
Hold this message to install them.
**Note:** Reading [this guide](<https://yutaplug.github.io/Aliucord/userpfpbg>) is necessary if you want to use UserPFP/BG.
_ _
- NitroSpoof (fork) for emojis.
- BetterFakeStickers for stickers.
- UserPFP for profile picture.
- UserBG for banner.

[links (ignore)](https://github.com/kiwi-706/AliucordPlugins/raw/builds/NitroSpoof.ziphttps://github.com/Archimedes9500/aliucord-plugins/raw/builds/BetterFakeStickers.ziphttps://github.com/OmegaSunkey/awesomeplugins/raw/builds/UserPFP.ziphttps://github.com/OmegaSunkey/awesomeplugins/raw/builds/UserBG.zip)`;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fakenitro')
    .setDescription('Get the "fakenitro" plugins for Aliucord')
    .addBooleanOption(option =>
      option.setName('send')
        .setDescription('Send publicly or privately (default: private)')
        .setRequired(false)),

  async execute(interaction) {
    const isSupported = isChannelSupported(interaction.channelId);

    if (!isSupported) {
      await interaction.deferReply();
      try {
        const msg = await interaction.followUp({
          content: 'Use command in <#847566769258233926> for hold-to-install feature'
        });
        setTimeout(() => msg.delete().catch(() => {}), 30000);
      } catch (err) {
        console.error('Error sending info message:', err);
      }
      return;
    }

    const send = interaction.options.getBoolean('send') ?? false;
    const deferOptions = send ? {} : { flags: MessageFlags.Ephemeral };
    await interaction.deferReply(deferOptions);

    await interaction.editReply({ content: FAKENITRO_MESSAGE });
  },

  async executePrefix(message, args) {
    const isSupported = isChannelSupported(message.channelId);

    if (!isSupported) {
      try {
        const msg = await message.reply({
          content: 'Use command in <#847566769258233926> for hold-to-install feature'
        });
        setTimeout(() => msg.delete().catch(() => {}), 30000);
      } catch (err) {
        console.error('Error sending info message:', err);
      }
      return;
    }

    await message.reply({ content: FAKENITRO_MESSAGE });
  }
};

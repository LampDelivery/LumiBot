const { responders } = require('../utils/database');
const { sendMinkyToChannel } = require('../utils/helpers');
const { parseMessage } = require('../utils/prefixParser');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message) {
    if (message.author.bot) return;

    if (!message.guild) {
      await sendMinkyToChannel(message.channel);
      return;
    }

    const parsed = parseMessage(message);
    if (parsed) {
      const command = message.client.commands.get(parsed.commandName);
      if (command && command.executePrefix) {
        try {
          await command.executePrefix(message, parsed.args, parsed.rawArgs);
        } catch (error) {
          console.error(`Error executing prefix command ${parsed.commandName}:`, error);
          await message.reply('❌ There was an error executing this command.');
        }
        return;
      }
    }

    const guildResponders = responders[message.guild.id] || [];

    for (const r of guildResponders) {
      const matches = message.content.toLowerCase().includes(r.trigger);
      const channelMatch = !r.channelId || message.channel.id === r.channelId;

      if (matches && channelMatch) {
        await message.reply(r.response);
        return;
      }
    }
  }
};

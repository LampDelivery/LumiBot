const PREFIX = 'l!';

function parseMessage(message) {
  const content = message.content.trim();
  
  if (!content.toLowerCase().startsWith(PREFIX)) {
    return null;
  }
  
  const withoutPrefix = content.slice(PREFIX.length).trim();
  const args = withoutPrefix.split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  
  if (!commandName) return null;
  
  return {
    commandName,
    args,
    rawArgs: withoutPrefix.slice(commandName.length).trim()
  };
}

function parseChannelMention(arg) {
  const match = arg?.match(/^<#(\d+)>$/);
  return match ? match[1] : null;
}

function findChannel(guild, arg) {
  if (!arg) return null;
  
  const mentionId = parseChannelMention(arg);
  if (mentionId) {
    return guild.channels.cache.get(mentionId);
  }
  
  return guild.channels.cache.find(c => c.name.toLowerCase() === arg.toLowerCase());
}

module.exports = {
  PREFIX,
  parseMessage,
  parseChannelMention,
  findChannel
};

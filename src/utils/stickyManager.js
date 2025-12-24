const { client } = require('./database');

// In-memory cache of sticky configs by channelId
const stickies = {}; // { [channelId]: { guildId, content, lastMessageId } }

async function initializeStickyManager() {
  try {
    // Schema creation is handled in initializeDatabase(); simply load rows.
    const result = await client.execute({
      sql: 'SELECT guild_id, channel_id, content, last_message_id FROM sticky_messages',
      args: []
    });
    for (const row of result.rows) {
      stickies[row.channel_id] = {
        guildId: row.guild_id,
        content: row.content,
        lastMessageId: row.last_message_id || null
      };
    }
    console.log(`Loaded ${Object.keys(stickies).length} sticky configs`);
  } catch (err) {
    console.error('Error initializing sticky manager:', err.message || err);
  }
}

async function setSticky(guildId, channel, content) {
  const channelId = channel.id;
  try {
    // Save to DB
    await client.execute({
      sql: 'INSERT OR REPLACE INTO sticky_messages (guild_id, channel_id, content, last_message_id) VALUES (?, ?, ?, COALESCE((SELECT last_message_id FROM sticky_messages WHERE guild_id = ? AND channel_id = ?), NULL))',
      args: [guildId, channelId, content, guildId, channelId]
    });
    // Update cache
    if (!stickies[channelId]) stickies[channelId] = { guildId, content, lastMessageId: null };
    stickies[channelId].guildId = guildId;
    stickies[channelId].content = content;

    // Repost immediately: delete old sticky if present, then send new one
    await repostSticky(channel);
    return true;
  } catch (err) {
    console.error('Error setting sticky:', err.message || err);
    return false;
  }
}

async function disableSticky(guildId, channel) {
  const channelId = channel.id;
  try {
    // Delete DB entry
    await client.execute({
      sql: 'DELETE FROM sticky_messages WHERE guild_id = ? AND channel_id = ?',
      args: [guildId, channelId]
    });

    // Delete any last sticky message
    const lastId = stickies[channelId]?.lastMessageId;
    if (lastId) {
      try {
        const msg = await channel.messages.fetch(lastId);
        if (msg && msg.deletable) await msg.delete();
      } catch (_) {
        // ignore fetch/delete errors
      }
    }

    delete stickies[channelId];
    return true;
  } catch (err) {
    console.error('Error disabling sticky:', err.message || err);
    return false;
  }
}

function getSticky(channelId) {
  return stickies[channelId] || null;
}

async function handleMessage(message) {
  // Only act in guild text channels
  if (!message.guild) return;
  const channelId = message.channel.id;
  const cfg = stickies[channelId];
  if (!cfg) return;

  // Prevent reacting to our own sticky repost
  if (message.author.bot && message.id === cfg.lastMessageId) return;

  // Repost sticky to keep it at the bottom
  try {
    await repostSticky(message.channel);
  } catch (err) {
    console.error('Error handling sticky on message:', err.message || err);
  }
}

async function repostSticky(channel) {
  const channelId = channel.id;
  const cfg = stickies[channelId];
  if (!cfg) return;

  // Delete old sticky if present
  if (cfg.lastMessageId) {
    try {
      const msg = await channel.messages.fetch(cfg.lastMessageId);
      if (msg && msg.deletable) await msg.delete();
    } catch (_) {
      // ignore fetch/delete errors (message may be gone or no perms)
    }
  }

  // Send new sticky
  const sent = await channel.send({ content: cfg.content });

  // Update cache and DB with new last_message_id
  cfg.lastMessageId = sent.id;
  try {
    // Prefer updating by both guild_id and channel_id to match schema
    if (cfg.guildId) {
      await client.execute({
        sql: 'UPDATE sticky_messages SET last_message_id = ? WHERE guild_id = ? AND channel_id = ?',
        args: [sent.id, cfg.guildId, channelId]
      });
    } else {
      // Fallback for legacy rows without guild_id
      await client.execute({
        sql: 'UPDATE sticky_messages SET last_message_id = ? WHERE channel_id = ?',
        args: [sent.id, channelId]
      });
    }
  } catch (err) {
    console.error('Error updating sticky last_message_id:', err.message || err);
  }
}

module.exports = {
  initializeStickyManager,
  setSticky,
  disableSticky,
  getSticky,
  handleMessage
};

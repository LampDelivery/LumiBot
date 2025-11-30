const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const responders = {};
const minkyIntervals = {};

async function loadAutoresponders() {
  try {
    const result = await pool.query('SELECT * FROM autoresponders');
    for (const row of result.rows) {
      if (!responders[row.guild_id]) responders[row.guild_id] = [];
      responders[row.guild_id].push({
        trigger: row.trigger_phrase,
        response: row.response,
        channelId: row.channel_id
      });
    }
    console.log(`Loaded ${result.rows.length} autoresponders from database`);
  } catch (err) {
    console.error('Error loading autoresponders:', err);
  }
}

async function saveAutoresponder(guildId, trigger, response, channelId) {
  try {
    await pool.query(
      'INSERT INTO autoresponders (guild_id, trigger_phrase, response, channel_id) VALUES ($1, $2, $3, $4) ON CONFLICT (guild_id, trigger_phrase, channel_id) DO UPDATE SET response = $3',
      [guildId, trigger, response, channelId]
    );
  } catch (err) {
    console.error('Error saving autoresponder:', err);
  }
}

async function deleteAutoresponderFromDb(guildId, trigger, channelId) {
  try {
    if (channelId) {
      await pool.query(
        'DELETE FROM autoresponders WHERE guild_id = $1 AND trigger_phrase = $2 AND channel_id = $3',
        [guildId, trigger, channelId]
      );
    } else {
      await pool.query(
        'DELETE FROM autoresponders WHERE guild_id = $1 AND trigger_phrase = $2 AND channel_id IS NULL',
        [guildId, trigger]
      );
    }
  } catch (err) {
    console.error('Error deleting autoresponder:', err);
  }
}

async function saveMinkyInterval(guildId, channelId, intervalStr, intervalMs) {
  try {
    await pool.query(
      'INSERT INTO minky_intervals (guild_id, channel_id, interval_str, interval_ms) VALUES ($1, $2, $3, $4) ON CONFLICT (guild_id, channel_id) DO UPDATE SET interval_str = $3, interval_ms = $4',
      [guildId, channelId, intervalStr, intervalMs]
    );
  } catch (err) {
    console.error('Error saving minky interval:', err);
  }
}

async function deleteMinkyIntervalFromDb(guildId, channelId) {
  try {
    await pool.query(
      'DELETE FROM minky_intervals WHERE guild_id = $1 AND channel_id = $2',
      [guildId, channelId]
    );
  } catch (err) {
    console.error('Error deleting minky interval:', err);
  }
}

async function loadMinkyIntervalsFromDb() {
  try {
    const result = await pool.query('SELECT * FROM minky_intervals');
    return result.rows;
  } catch (err) {
    console.error('Error loading minky intervals:', err);
    return [];
  }
}

async function saveBotStatus(status, activity, message) {
  try {
    await pool.query('DELETE FROM bot_status');
    await pool.query(
      'INSERT INTO bot_status (status, activity, message) VALUES ($1, $2, $3)',
      [status, activity, message]
    );
  } catch (err) {
    console.error('Error saving bot status:', err);
  }
}

async function loadBotStatus() {
  try {
    const result = await pool.query('SELECT * FROM bot_status LIMIT 1');
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error loading bot status:', err);
    return null;
  }
}

module.exports = {
  pool,
  responders,
  minkyIntervals,
  loadAutoresponders,
  saveAutoresponder,
  deleteAutoresponderFromDb,
  saveMinkyInterval,
  deleteMinkyIntervalFromDb,
  loadMinkyIntervalsFromDb,
  saveBotStatus,
  loadBotStatus
};

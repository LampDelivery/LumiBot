const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'huskboard',
  init(client) {
    const STARBOARD_EMOJI_NAME = 'husk';
    const STARBOARD_CHANNEL_ID = '832767334904102982';
    const MIN_STARS = 4;

    client.on('messageReactionAdd', async (reaction, user) => {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();

      const targetChannel = client.channels.cache.get(STARBOARD_CHANNEL_ID);
      if (!targetChannel || reaction.message.guildId !== targetChannel.guildId) return;

      if (reaction.emoji.name !== STARBOARD_EMOJI_NAME) return;
      if (reaction.message.author.id === user.id) {
        try {
          await reaction.users.remove(user.id);
        } catch (err) {
          console.error('Failed to remove self-husk:', err);
        }
        return;
      }

      if (!reaction.message.content && reaction.message.attachments.size === 0) {
        return;
      }

      const starReaction = reaction.message.reactions.cache.find(r => r.emoji.name === STARBOARD_EMOJI_NAME);
      const count = starReaction ? starReaction.count : 0;
      
      await updateHuskboard(reaction.message, count, STARBOARD_CHANNEL_ID, MIN_STARS);
    });

    client.on('messageReactionRemove', async (reaction, user) => {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();

      const targetChannel = client.channels.cache.get(STARBOARD_CHANNEL_ID);
      if (!targetChannel || reaction.message.guildId !== targetChannel.guildId) return;

      if (reaction.emoji.name !== STARBOARD_EMOJI_NAME) return;
      
      const starReaction = reaction.message.reactions.cache.find(r => r.emoji.name === STARBOARD_EMOJI_NAME);
      const count = starReaction ? starReaction.count : 0;
      await updateHuskboard(reaction.message, count, STARBOARD_CHANNEL_ID, MIN_STARS);
    });

    client.on('messageReactionRemoveAll', async (message) => {
      if (message.partial) await message.fetch();
      await updateHuskboard(message, 0, STARBOARD_CHANNEL_ID, MIN_STARS);
    });

    client.on('messageDelete', async (message) => {
      await updateHuskboard(message, 0, STARBOARD_CHANNEL_ID, MIN_STARS);
    });
  }
};

async function updateHuskboard(message, count, starboardChannelId, minStars) {
  const starboardChannel = message.client.channels.cache.get(starboardChannelId);
  if (!starboardChannel) return;

  const messages = await starboardChannel.messages.fetch({ limit: 100 });
  const starboardMsg = messages.find(m => 
    m.author.id === message.client.user.id &&
    m.embeds.length > 0 && 
    m.embeds[m.embeds.length - 1].footer && 
    m.embeds[m.embeds.length - 1].footer.text.endsWith(message.id)
  );

  if (count < minStars) {
    if (starboardMsg) {
      try {
        await starboardMsg.delete();
      } catch (err) {
        console.error('Failed to delete huskboard message:', err);
      }
    }
    return;
  }

  const emote = getStarboardEmote(count);
  const content = `${emote} ${count} | <#${message.channelId}>`;
  
  const mainEmbed = generateMessageEmbed(message, false);
  const embeds = [];
  
  if (message.reference) {
    try {
      const referencedMsg = await message.fetchReference();
      embeds.push(generateMessageEmbed(referencedMsg, true));
    } catch (err) {
      console.error('Failed to fetch reference for huskboard:', err);
    }
  }
  embeds.push(mainEmbed);

  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
  const jumpButton = new ButtonBuilder()
    .setLabel('Jump')
    .setURL(message.url)
    .setStyle(ButtonStyle.Link);
    
  const components = [new ActionRowBuilder().addComponents(jumpButton)];
  
  if (message.reference) {
    try {
      const referencedMsg = await message.fetchReference();
      const jumpRefButton = new ButtonBuilder()
        .setLabel('Jump to referenced message')
        .setURL(referencedMsg.url)
        .setStyle(ButtonStyle.Link);
      components[0].addComponents(jumpRefButton);
    } catch {}
  }

  if (starboardMsg) {
    if (starboardMsg.content !== content) {
      await starboardMsg.edit({ content, embeds, components });
    }
  } else {

    // Custom huskboard profile via webhook
    const isHuskboardChannel = message.channelId === STARBOARD_CHANNEL_ID;
    
    const webhookData = {
      username: isHuskboardChannel ? 'Huskboard' : message.client.user.username,
      avatarURL: isHuskboardChannel ? 'https://files.catbox.moe/y7a4m5.webp' : message.client.user.displayAvatarURL()
    };
    
    try {
      const webhooks = await starboardChannel.fetchWebhooks();
      let webhook = webhooks.find(wh => wh.owner.id === message.client.user.id);

      if (!webhook) {
        webhook = await starboardChannel.createWebhook({
          name: 'Huskboard Webhook',
          avatar: message.client.user.displayAvatarURL(),
        });
      }

      await webhook.send({
        content,
        embeds,
        components,
        username: webhookData.username,
        avatarURL: webhookData.avatarURL
      });
    } catch (err) {
      console.error('Failed to send via webhook, falling back to standard send:', err);
      await starboardChannel.send({ content, embeds, components });
    }
  }
}

function getStarboardEmote(count) {
  if (count >= 10) return '<:husker:1041822220479111238>'; // Tier 3
  if (count >= 6) return '<:husk:859796756111294474>';    // Tier 2
  return '<:hu:1002943896311042119>';                    // Tier 1
}

function generateMessageEmbed(msg, isReply) {
  const embed = new EmbedBuilder()
    .setAuthor({ 
      name: isReply ? `Replying to ${msg.author.tag}` : msg.author.tag, 
      iconURL: msg.author.displayAvatarURL() 
    })
    .setDescription(msg.content || null)
    .setTimestamp(msg.createdAt)
    .setFooter({ text: `ID: ${msg.id}` })
    .setColor(isReply ? 0x000000 : 0xFFFFD2);

  msg.attachments.forEach(attachment => {
    if (attachment.contentType?.startsWith('image') && !embed.data.image) {
      embed.setImage(attachment.url);
    }
  });

  if (!embed.data.image) {
    msg.embeds.forEach(e => {
      if (e.image) {
        embed.setImage(e.image.url);
      }
    });
  }

  let attachmentLinks = '';
  msg.attachments.forEach(a => {
    if (!embed.data.image || a.url !== embed.data.image.url) {
      attachmentLinks += `[${a.name}](${a.url})\n`;
    }
  });

  if (attachmentLinks) {
    embed.addFields({ name: 'Attachments', value: attachmentLinks });
  }

  return embed;
}

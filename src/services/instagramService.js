const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const http = require('http');
const config = require('../config');
const db = require('../database/db');
const componentsV2 = require('../utils/componentsV2');

const INSTAGRAM_CHANNEL_NAME = '📸ㆍinstagram';
const INSTAGRAM_COLOR = 0xE1306C; // Instagram Accent Pink / Purple

/**
 * Helper to extract Instagram Shortcode / ID from URL
 */
function extractInstagramPostId(url) {
  if (!url) return `ig_${Date.now()}`;
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const pIndex = parts.findIndex(p => p === 'p' || p === 'reel' || p === 'tv');
    if (pIndex !== -1 && parts[pIndex + 1]) {
      return parts[pIndex + 1];
    }
  } catch {}
  // Fallback: sanitized string or regex
  const match = url.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  if (match && match[2]) {
    return match[2];
  }
  return url.replace(/[^a-zA-Z0-9_-]/g, '_').slice(-40) || `ig_${Date.now()}`;
}

module.exports = {
  INSTAGRAM_CHANNEL_NAME,
  INSTAGRAM_COLOR,

  /**
   * Finds or creates the dedicated #📸ㆍinstagram channel in the 'Important' category directly below #📰ㆍnews
   */
  async ensureInstagramChannel(guild) {
    if (!guild) return null;

    const channels = await guild.channels.fetch().catch(() => null);
    if (!channels) return null;

    // 1. Check if configured explicitly or by name
    let channel = null;
    if (config.instagram.channelId) {
      channel = channels.get(config.instagram.channelId);
    }

    if (!channel) {
      channel = channels.find(
        c => c && c.type === ChannelType.GuildText && (
          c.name === INSTAGRAM_CHANNEL_NAME ||
          c.name.toLowerCase().includes('instagram') ||
          c.name.toLowerCase() === 'insta'
        )
      );
    }

    // Find 'Important' category
    const importantCategory = channels.find(
      c => c && c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('important')
    );

    // Find 'news' channel to position directly below it
    const newsChannel = channels.find(
      c => c && c.type === ChannelType.GuildText &&
           c.name.toLowerCase().includes('news') &&
           !c.name.toLowerCase().includes('staff')
    );

    const targetPosition = newsChannel ? newsChannel.position + 1 : 2;

    const everyoneRole = guild.roles.everyone;
    const verifiedRole = guild.roles.cache.find(r => r.name.toLowerCase().includes('verified'));
    const modRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'moderator');
    const adminRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'admin');

    const overwrites = [
      {
        id: everyoneRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AddReactions
        ],
        deny: [
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.CreatePublicThreads,
          PermissionFlagsBits.CreatePrivateThreads
        ]
      }
    ];

    if (verifiedRole) {
      overwrites.push({
        id: verifiedRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AddReactions
        ],
        deny: [
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.CreatePublicThreads,
          PermissionFlagsBits.CreatePrivateThreads
        ]
      });
    }

    if (modRole) {
      overwrites.push({
        id: modRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles
        ]
      });
    }

    if (adminRole) {
      overwrites.push({
        id: adminRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.MentionEveryone
        ]
      });
    }

    // Bot permissions
    if (guild.members.me) {
      overwrites.push({
        id: guild.members.me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.MentionEveryone
        ]
      });
    }

    if (!channel) {
      channel = await guild.channels.create({
        name: INSTAGRAM_CHANNEL_NAME,
        type: ChannelType.GuildText,
        topic: 'Official Instagram posts, aviation photography highlights, and social updates.',
        parent: importantCategory ? importantCategory.id : null,
        position: targetPosition,
        permissionOverwrites: overwrites,
        reason: 'Auto-creation of Instagram feed channel in Important category under news'
      }).catch(err => {
        console.error('❌ Failed to create Instagram channel:', err.message);
        return null;
      });

      if (channel) {
        console.log(`📸 Created Instagram channel #${channel.name} in ${guild.name} under ${importantCategory ? importantCategory.name : 'root'}`);
      }
    } else {
      // Channel exists - make sure category and position are synced
      const updates = {};
      if (importantCategory && channel.parentId !== importantCategory.id) {
        updates.parent = importantCategory.id;
      }
      if (newsChannel && channel.position <= newsChannel.position) {
        updates.position = targetPosition;
      }
      if (Object.keys(updates).length > 0) {
        await channel.edit(updates).catch(() => {});
      }
    }

    return channel;
  },

  /**
   * Build Discord message payload for an Instagram post
   */
  buildInstagramPayload({ postUrl, caption = '', imageUrl = null, author = null, pingEveryone = false }) {
    const handle = author || config.instagram.username || 'eddm.a350.spotter';
    const content = pingEveryone ? '@everyone 📸 **New Instagram Post!**' : '📸 **New Instagram Post!**';

    // Format caption cleanly (trim if too long)
    let cleanCaption = (caption || '').trim();
    if (cleanCaption.length > 1000) {
      cleanCaption = cleanCaption.substring(0, 997) + '...';
    }

    // Components V2 layout
    const sectionText = `## 📸 New Instagram Post\n` +
      (handle ? `By **@${handle}**\n\n` : '\n') +
      (cleanCaption ? `${cleanCaption}\n\n` : '') +
      `🔗 [View on Instagram](${postUrl})`;

    const containerComponents = [
      componentsV2.createSection({ text: sectionText })
    ];

    if (imageUrl) {
      containerComponents.push(componentsV2.createMediaGallery([imageUrl]));
    }

    containerComponents.push(componentsV2.createSeparator({ divider: true, spacing: 1 }));

    const actionRow = componentsV2.createActionRow([
      componentsV2.createButton({
        label: 'View on Instagram',
        url: postUrl,
        emoji: '📸'
      })
    ]);
    containerComponents.push(actionRow);

    const container = componentsV2.createContainer({
      accentColor: INSTAGRAM_COLOR,
      components: containerComponents
    });

    // Standard Embed fallback
    const embed = new EmbedBuilder()
      .setColor(INSTAGRAM_COLOR)
      .setAuthor({
        name: `Instagram • @${handle}`,
        iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/600px-Instagram_icon.png',
        url: postUrl
      })
      .setTitle('📸 New Instagram Post!')
      .setURL(postUrl)
      .setDescription(cleanCaption || 'Check out the latest post on Instagram!')
      .setFooter({ text: `${config.footerText} • Instagram Feed` })
      .setTimestamp();

    if (imageUrl) {
      embed.setImage(imageUrl);
    }

    const legacyRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('View on Instagram')
        .setStyle(ButtonStyle.Link)
        .setURL(postUrl)
        .setEmoji('📸')
    );

    return {
      content,
      allowedMentions: pingEveryone ? { parse: ['everyone'] } : { parse: [] },
      components: [container],
      flags: componentsV2.IS_COMPONENTS_V2,
      // fallback fields for standard sending
      fallbackEmbed: embed,
      fallbackRow: legacyRow
    };
  },

  /**
   * Post an Instagram update to all target guilds
   */
  async postInstagramUpdate(client, {
    postUrl,
    caption = '',
    imageUrl = null,
    author = null,
    pingEveryone = false,
    guildId = null,
    force = false
  }) {
    if (!postUrl) {
      throw new Error('Post URL is required');
    }

    const postId = extractInstagramPostId(postUrl);

    // Deduplication check
    if (!force && db.isInstagramPostRecorded(postId)) {
      console.log(`ℹ️ Instagram post ${postId} has already been announced. Skipping.`);
      return { skipped: true, postId };
    }

    const guildsToPost = [];
    if (guildId) {
      const g = client.guilds.cache.get(guildId);
      if (g) guildsToPost.push(g);
    } else if (config.guildId) {
      const g = client.guilds.cache.get(config.guildId);
      if (g) guildsToPost.push(g);
    } else {
      for (const g of client.guilds.cache.values()) {
        guildsToPost.push(g);
      }
    }

    if (guildsToPost.length === 0) {
      throw new Error('No target Discord guild found to post Instagram update.');
    }

    const payload = this.buildInstagramPayload({
      postUrl,
      caption,
      imageUrl,
      author: author || config.instagram.username || 'eddm.a350.spotter',
      pingEveryone
    });

    const results = [];

    for (const guild of guildsToPost) {
      try {
        const channel = await this.ensureInstagramChannel(guild);
        if (!channel) {
          console.error(`❌ Could not resolve Instagram channel in ${guild.name}`);
          continue;
        }

        let sentMessage = null;
        try {
          // Attempt Components V2 send
          sentMessage = await channel.send({
            content: payload.content,
            allowedMentions: payload.allowedMentions,
            components: payload.components,
            flags: payload.flags
          });
        } catch (v2Err) {
          console.warn('Components V2 send failed, falling back to standard embed:', v2Err.message);
          sentMessage = await channel.send({
            content: payload.content,
            allowedMentions: payload.allowedMentions,
            embeds: [payload.fallbackEmbed],
            components: [payload.fallbackRow]
          });
        }

        if (sentMessage) {
          console.log(`📢 Successfully posted Instagram update to #${channel.name} in ${guild.name} (ID: ${sentMessage.id})`);
          results.push({ guildId: guild.id, channelId: channel.id, messageId: sentMessage.id });
        }
      } catch (err) {
        console.error(`❌ Error posting Instagram update to guild ${guild.id}:`, err);
      }
    }

    // Record in SQLite database for deduplication
    db.recordInstagramPost({
      postId,
      postUrl,
      caption,
      imageUrl: imageUrl || '',
      guildId: guildId || config.guildId
    });

    return {
      success: results.length > 0,
      postId,
      results
    };
  },

  /**
   * Starts a lightweight HTTP webhook receiver for services like IFTTT, Make.com, Zapier, etc.
   */
  startWebhookServer(client) {
    const port = config.instagram.webhookPort || 3000;

    const server = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-webhook-secret, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
      }

      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

      // Health check endpoint
      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health' || url.pathname === '/api/instagram/health')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          status: 'online',
          bot: client.user ? client.user.tag : 'initializing',
          channel: INSTAGRAM_CHANNEL_NAME,
          user: config.instagram.username || 'eddm.a350.spotter',
          timestamp: new Date().toISOString()
        }));
      }

      // Webhook receiver endpoint: POST /api/instagram or POST /webhook/instagram
      if (req.method === 'POST' && (url.pathname === '/api/instagram' || url.pathname === '/webhook/instagram')) {
        // Optional secret check
        if (config.instagram.webhookSecret) {
          const secret = req.headers['x-webhook-secret'] || url.searchParams.get('secret');
          if (secret !== config.instagram.webhookSecret) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Unauthorized: Invalid webhook secret' }));
          }
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
          if (body.length > 1e6) { // 1MB limit
            req.destroy();
          }
        });

        req.on('end', async () => {
          try {
            let data = {};
            if (body.trim()) {
              try {
                data = JSON.parse(body);
              } catch {
                // If sent as form-urlencoded
                const params = new URLSearchParams(body);
                data = Object.fromEntries(params.entries());
              }
            }

            // Flexible field mapping (supports IFTTT, Zapier, Make, custom scripts)
            const postUrl = data.url || data.link || data.postUrl || data.permalink || data.SourceUrl;
            const caption = data.caption || data.text || data.description || data.title || data.Caption || '';
            const imageUrl = data.imageUrl || data.image || data.photo || data.mediaUrl || data.SourceUrl;
            const author = data.author || data.username || data.User || config.instagram.username || 'eddm.a350.spotter';

            if (!postUrl) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ error: 'Missing post URL (url, link, or SourceUrl required)' }));
            }

            console.log(`📩 Received Instagram webhook for post: ${postUrl}`);

            const result = await this.postInstagramUpdate(client, {
              postUrl,
              caption,
              imageUrl,
              author,
              pingEveryone: false
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
              success: true,
              result
            }));
          } catch (postErr) {
            console.error('❌ Error handling Instagram webhook:', postErr);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: postErr.message }));
          }
        });
        return;
      }

      // Not found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    server.on('error', err => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️ Instagram Webhook port ${port} is already in use. Webhook server will not listen on this port.`);
      } else {
        console.error('❌ Instagram Webhook server error:', err.message);
      }
    });

    server.listen(port, () => {
      console.log(`🌐 Instagram Webhook Receiver listening on port ${port} (endpoint: http://localhost:${port}/api/instagram)`);
    });

    return server;
  },

  /**
   * Polls configured RSS Feed (e.g. from RSS.app or RSSHub)
   */
  async pollRssFeed(client) {
    const rssUrl = config.instagram.rssUrl;
    if (!rssUrl) return;

    try {
      const response = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'AviBot-Instagram-Poller/1.0'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        console.warn(`⚠️ Failed to fetch Instagram RSS feed (status ${response.status})`);
        return;
      }

      const xmlText = await response.text();

      // Extract items using regex (avoids heavy external XML dependency)
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      let match;
      const items = [];

      while ((match = itemRegex.exec(xmlText)) !== null) {
        const itemContent = match[1];

        // Extract link
        const linkMatch = itemContent.match(/<link>(.*?)<\/link>/i) ||
                          itemContent.match(/<guid[^>]*>(https?:\/\/[^<]+)<\/guid>/i);
        const link = linkMatch ? linkMatch[1].trim() : null;

        // Extract title or description
        const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) ||
                           itemContent.match(/<title>(.*?)<\/title>/i);
        const descMatch = itemContent.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i) ||
                          itemContent.match(/<description>(.*?)<\/description>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';
        const desc = descMatch ? descMatch[1].trim().replace(/<[^>]*>/g, '') : '';

        // Extract media/image
        const mediaMatch = itemContent.match(/<media:content[^>]+url="([^">]+)"/i) ||
                           itemContent.match(/<enclosure[^>]+url="([^">]+)"/i) ||
                           itemContent.match(/<img[^>]+src="([^">]+)"/i);
        const imageUrl = mediaMatch ? mediaMatch[1].trim() : null;

        if (link) {
          items.push({
            url: link,
            caption: desc || title,
            imageUrl
          });
        }
      }

      // Check latest item (first in list)
      if (items.length > 0) {
        const latest = items[0];
        const postId = extractInstagramPostId(latest.url);

        if (!db.isInstagramPostRecorded(postId)) {
          console.log(`🆕 Found new Instagram post from RSS: ${latest.url}`);
          await this.postInstagramUpdate(client, {
            postUrl: latest.url,
            caption: latest.caption,
            imageUrl: latest.imageUrl,
            pingEveryone: false
          });
        }
      }
    } catch (err) {
      console.warn(`⚠️ Error polling Instagram RSS feed: ${err.message}`);
    }
  }
};

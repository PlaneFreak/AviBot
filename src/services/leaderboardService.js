const { ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const config = require('../config');

const LEADERBOARD_CHANNEL_NAME = '🏆ㆍphoto-leaderboard';

const PERIOD_CONFIG = {
  daily: {
    key: 'last_daily_run',
    name: 'Daily Photo Leaderboard',
    durationSeconds: 24 * 60 * 60, // 24 hours
    icon: '☀️',
    color: 0x3498DB,
    xpRewards: [2, 1, 0] // 1st, 2nd, 3rd
  },
  three_days: {
    key: 'last_3day_run',
    name: '3-Day Spotter Showcase',
    durationSeconds: 3 * 24 * 60 * 60, // 72 hours
    icon: '⚡',
    color: 0x9B59B6,
    xpRewards: [5, 3, 1]
  },
  weekly: {
    key: 'last_weekly_run',
    name: 'Weekly Photo Championship',
    durationSeconds: 7 * 24 * 60 * 60, // 7 days
    icon: '🏆',
    color: 0xF1C40F,
    xpRewards: [10, 5, 3] // Base weekly
  },
  monthly: {
    key: 'last_monthly_run',
    name: 'Monthly Aviation Champions',
    durationSeconds: 30 * 24 * 60 * 60, // 30 days
    icon: '👑',
    color: 0xE67E22,
    xpRewards: [40, 20, 12]
  },
  yearly: {
    key: 'last_yearly_run',
    name: 'Grand Yearly Hall of Fame',
    durationSeconds: 365 * 24 * 60 * 60, // 365 days
    icon: '🌌',
    color: 0xE74C3C,
    xpRewards: [1000, 500, 300] // 100x weekly!
  }
};

module.exports = {
  LEADERBOARD_CHANNEL_NAME,
  PERIOD_CONFIG,

  /**
   * Finds or creates the 🏆ㆍphoto-leaderboard channel
   */
  async getOrCreateLeaderboardChannel(guild) {
    const channels = await guild.channels.fetch();
    let channel = channels.find(
      c => c && c.type === ChannelType.GuildText && (c.name === LEADERBOARD_CHANNEL_NAME || c.name.toLowerCase().includes('photo-leaderboard') || c.name.toLowerCase().includes('leaderboard'))
    );

    if (channel) return channel;

    // Find Spotting or Important category to place the leaderboard into
    const category = channels.find(
      c => c && c.type === ChannelType.GuildCategory && (c.name.toLowerCase().includes('spotting') || c.name.toLowerCase().includes('important'))
    );

    const everyoneRole = guild.roles.everyone;

    channel = await guild.channels.create({
      name: LEADERBOARD_CHANNEL_NAME,
      type: ChannelType.GuildText,
      parent: category ? category.id : null,
      topic: 'Official community photo leaderboards (Daily, 3-Day, Weekly, Monthly, and Yearly showcases).',
      permissionOverwrites: [
        {
          id: everyoneRole.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
          deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.CreatePublicThreads]
        }
      ],
      reason: 'Auto-creation of photo leaderboard channel'
    });

    return channel;
  },

  /**
   * Generates and posts a leaderboard for a specific period
   */
  async postLeaderboard(guild, periodType, isManual = false) {
    const conf = PERIOD_CONFIG[periodType];
    if (!conf) return null;

    const channel = await this.getOrCreateLeaderboardChannel(guild);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const sinceTimestamp = nowSeconds - conf.durationSeconds;

    let topPhotos = db.getTopPhotosByTimeframe(guild.id, sinceTimestamp, 10);
    let isFallback = false;

    if (!topPhotos || topPhotos.length === 0) {
      topPhotos = db.getAllTopPhotos(guild.id, 10);
      isFallback = true;
    }

    const componentsV2 = require('../utils/componentsV2');

    if (!topPhotos || topPhotos.length === 0) {
      const emptyContainer = componentsV2.createContainer({
        accentColor: conf.color || 0xF1C40F,
        components: [
          componentsV2.createSection({
            text:
              `# ${conf.icon} ${conf.name}\n\n` +
              `*No planespotting photos have been rated yet!*\n\n` +
              `📸 Upload your aviation photos in <#${guild.channels.cache.find(c => c.name.includes('photo-submit'))?.id || 'photo-submit'}> ` +
              `and vote in <#${guild.channels.cache.find(c => c.name.includes('pic-rating'))?.id || 'pic-rating'}> to appear on the leaderboard!`
          })
        ]
      });

      const msg = await componentsV2.sendToChannel(guild.client, channel.id, [emptyContainer]);
      db.setLastLeaderboardRun(conf.key, guild.id, nowSeconds);
      return { channel, message: msg, topPhotos: [] };
    }

    // Top 1 Showcase
    const winner = topPhotos[0];
    const winnerAvg = winner.vote_count > 0 ? (winner.total_rating_sum / winner.vote_count).toFixed(1) : '0.0';

    // List Placements 1 to 10
    let rankList = '';
    const medals = ['🥇', '🥈', '🥉'];

    for (let i = 0; i < topPhotos.length; i++) {
      const p = topPhotos[i];
      const medal = i < 3 ? medals[i] : `\`#${i + 1}\``;
      const userTag = `<@${p.user_id}>`;
      const avg = p.vote_count > 0 ? (p.total_rating_sum / p.vote_count).toFixed(1) : '0.0';

      rankList += `${medal} ${userTag} — **${p.total_points} pts** (*${avg}/10* • ${p.vote_count} votes)\n`;
    }

    const subtitleNotice = isFallback ? `*(Top Spotter Showcase)*` : `*(Past ${Math.round(conf.durationSeconds / 86400)} Days)*`;

    const container = componentsV2.createContainer({
      accentColor: conf.color || 0xF1C40F,
      components: [
        componentsV2.createMediaGallery([winner.image_url]),
        componentsV2.createSection({
          text:
            `# ${conf.icon} ${conf.name} ${subtitleNotice}\n\n` +
            `🥇 **1st Place Champion:** <@${winner.user_id}>\n` +
            `🏆 **${winner.total_points} Points** • ⭐ **${winnerAvg}/10 Avg** • 🗳️ **${winner.vote_count} Votes**\n` +
            (winner.caption ? `📝 *"${winner.caption}"*\n\n` : '\n') +
            `### 🎖️ Leaderboard Rankings\n${rankList.trim()}`
        })
      ]
    });

    const msg = await componentsV2.sendToChannel(guild.client, channel.id, [container]);
    db.setLastLeaderboardRun(conf.key, guild.id, nowSeconds);

    // Award XP to Winners
    if (conf.xpRewards && !isFallback) {
      for (let i = 0; i < Math.min(topPhotos.length, conf.xpRewards.length); i++) {
        const xpAmount = conf.xpRewards[i];
        if (xpAmount > 0) {
          const photo = topPhotos[i];
          db.addXP(photo.user_id, guild.id, xpAmount);
        }
      }
    }

    return { channel, message: msg, topPhotos };
  }
};

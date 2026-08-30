const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const adminLogService = require('./adminLogService');
const config = require('../config');

// In-memory spam tracker: userId -> { timestamps: [], lastMessage: '', duplicateCount: 0, violations: 0 }
const userSpamCache = new Map();

// Configuration Thresholds
const SPAM_WINDOW_MS = 4000;       // 4 seconds window
const MAX_MESSAGES = 5;             // Max 5 messages in 4s
const MAX_DUPLICATE_COUNT = 3;      // Max 3 identical messages
const MAX_MENTIONS = 4;             // Max 4 mentions per message
const MAX_NEWLINES = 12;            // Max 12 line breaks
const TIMEOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes timeout

module.exports = {
  /**
   * Evaluates a message for spam patterns.
   * Returns true if message was flagged and handled (should stop further processing).
   */
  async handleMessage(message) {
    if (!message.guild || message.author.bot) return false;

    const member = message.member;
    if (!member) return false;

    // Bypass check: Admins, Moderators, and Testers
    if (
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      member.permissions.has(PermissionFlagsBits.ManageMessages) ||
      member.roles.cache.some(r => r.name.toLowerCase().includes('admin') || r.name.toLowerCase().includes('mod') || r.name.toLowerCase().includes('tester'))
    ) {
      return false;
    }

    const userId = message.author.id;
    const now = Date.now();
    const content = message.content || '';

    let userData = userSpamCache.get(userId);
    if (!userData) {
      userData = {
        timestamps: [],
        lastMessage: '',
        duplicateCount: 1,
        violations: 0
      };
      userSpamCache.set(userId, userData);
    }

    // 1. Check Discord Invite Links (Anti-Advertising)
    const hasInvite = /(discord\.(gg|io|me|li)\/.+|discord\.com\/invite\/.+)/i.test(content);
    if (hasInvite) {
      const db = require('../database/db');
      const allowedCount = db.getAllowedInvites(userId, message.guild.id);

      if (allowedCount > 0) {
        const remaining = db.useAllowedInvite(userId, message.guild.id);
        console.log(`🔗 [Sponsored Invite] ${message.author.tag} posted an authorized invite. Remaining quota: ${remaining}`);

        // Log authorization to Admin Logs
        const adminChannel = await adminLogService.getOrCreateAdminLogChannel(message.guild);
        if (adminChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('🔗 Sponsored Invite Link Allowed')
            .setDescription(`**User:** ${member} (\`${member.user.tag}\`)\n**Channel:** ${message.channel}\n**Remaining Allowance:** ${remaining} invite(s) left`)
            .setTimestamp();
          await adminChannel.send({ embeds: [logEmbed] }).catch(() => {});
        }

        // Permitted: Do not delete, allow message through!
        return false;
      }

      await this.punishUser(message, member, 'Unauthorized Discord Invite Link', true);
      return true;
    }

    // 2. Check Mass Mentions
    const mentionCount = message.mentions.users.size + message.mentions.roles.size;
    const hasEveryone = message.mentions.everyone;
    if (mentionCount > MAX_MENTIONS || hasEveryone) {
      await this.punishUser(message, member, `Mass Mention Spam (${mentionCount} mentions)`, true);
      return true;
    }

    // 3. Check Line Flood / Wall of Text
    const newlineCount = (content.match(/\n/g) || []).length;
    if (newlineCount > MAX_NEWLINES) {
      await this.punishUser(message, member, `Line Break Flood (${newlineCount} newlines)`, false);
      return true;
    }

    // 4. Check Duplicate Message Spam
    if (content.length > 5 && content === userData.lastMessage) {
      userData.duplicateCount++;
      if (userData.duplicateCount >= MAX_DUPLICATE_COUNT) {
        await this.punishUser(message, member, `Duplicate Message Spam (x${userData.duplicateCount})`, true);
        userData.duplicateCount = 0;
        return true;
      }
    } else {
      userData.lastMessage = content;
      userData.duplicateCount = 1;
    }

    // 5. Check Rapid Message Frequency (Window Flooding)
    userData.timestamps.push(now);
    userData.timestamps = userData.timestamps.filter(t => now - t <= SPAM_WINDOW_MS);

    if (userData.timestamps.length >= MAX_MESSAGES) {
      await this.punishUser(message, member, `Rapid Message Flood (${userData.timestamps.length} msgs in ${SPAM_WINDOW_MS / 1000}s)`, true);
      userData.timestamps = [];
      return true;
    }

    return false;
  },

  /**
   * Applies punishment (warning or automatic timeout) and logs incident
   */
  async punishUser(message, member, reason, shouldTimeout = false) {
    const channel = message.channel;
    const guild = message.guild;

    // Delete offending message
    await message.delete().catch(() => {});

    let userData = userSpamCache.get(member.id) || { violations: 0 };
    userData.violations++;
    userSpamCache.set(member.id, userData);

    // Apply timeout if severe or repeat violation
    if (shouldTimeout || userData.violations >= 2) {
      const timeoutPromise = member.timeout(TIMEOUT_DURATION_MS, `[Anti-Spam] ${reason}`).catch(err => {
        console.warn(`Could not timeout ${member.user.tag}:`, err.message);
      });
      await timeoutPromise;

      // Send temporary chat notification
      const alertMsg = await channel.send({
        content: `🛡️ ${member}, you have been timed out for **5 minutes** due to: **${reason}**.`
      }).catch(() => {});
      if (alertMsg) {
        setTimeout(() => alertMsg.delete().catch(() => {}), 7000);
      }

      // Log to Admin Logs
      const adminChannel = await adminLogService.getOrCreateAdminLogChannel(guild);
      if (adminChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('🛡️ Anti-Spam Action Taken')
          .setDescription(`**User:** ${member} (\`${member.user.tag}\` - \`${member.id}\`)\n**Action:** 5-Minute Timeout\n**Reason:** ${reason}\n**Channel:** ${channel}`)
          .setTimestamp();
        await adminChannel.send({ embeds: [logEmbed] }).catch(() => {});
      }

      // Send DM
      await member.send({
        content: `⚠️ You were placed on a 5-minute timeout in **${guild.name}** for: **${reason}**.`
      }).catch(() => {});
    } else {
      // First warning
      const warnMsg = await channel.send({
        content: `⚠️ ${member}, please slow down! Excessive or repeated messaging is not allowed.`
      }).catch(() => {});
      if (warnMsg) {
        setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
      }
    }
  }
};

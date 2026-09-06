const { ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

const ADMIN_LOG_CHANNEL_NAME = '🛡️ㆍadmin-logs';

module.exports = {
  ADMIN_LOG_CHANNEL_NAME,

  /**
   * Finds or creates the admin log channel (Strictly ADMIN-ONLY, hidden from moderators)
   * Positioned at the very bottom of the Staff category.
   */
  async getOrCreateAdminLogChannel(guild) {
    const channels = await guild.channels.fetch();
    let channel = channels.find(
      c => c && c.type === ChannelType.GuildText && (c.name === ADMIN_LOG_CHANNEL_NAME || c.name.toLowerCase().includes('admin-log') || c.name.toLowerCase().includes('bot-log'))
    );

    const everyoneRole = guild.roles.everyone;
    const verifiedRole = guild.roles.cache.find(r => r.name.toLowerCase().includes('verified'));
    const adminRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'admin' || r.permissions.has(PermissionFlagsBits.Administrator));
    const modRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'moderator' || r.name.toLowerCase().includes('mod'));

    // Find the Staff category
    const staffCategory = channels.find(
      c => c && c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('staff')
    );

    const overwrites = [
      {
        id: everyoneRole.id,
        deny: [PermissionFlagsBits.ViewChannel] // Hidden from everyone
      }
    ];

    if (verifiedRole) {
      overwrites.push({
        id: verifiedRole.id,
        deny: [PermissionFlagsBits.ViewChannel] // Hidden from verified members
      });
    }

    if (adminRole) {
      overwrites.push({
        id: adminRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages]
      });
    }

    if (modRole) {
      overwrites.push({
        id: modRole.id,
        deny: [PermissionFlagsBits.ViewChannel] // Strictly HIDDEN from moderators
      });
    }

    if (!channel) {
      channel = await guild.channels.create({
        name: ADMIN_LOG_CHANNEL_NAME,
        type: ChannelType.GuildText,
        parent: staffCategory ? staffCategory.id : null,
        position: 99, // Placed at the very bottom of Staff category
        topic: 'Confidential Admin Logs. Only Server Administrators can view this channel.',
        permissionOverwrites: overwrites,
        reason: 'Auto-creation of Admin-Only Logs channel'
      });
    } else {
      // Ensure strict permissions and correct parent / position at bottom of Staff
      if (staffCategory && channel.parentId !== staffCategory.id) {
        await channel.setParent(staffCategory.id, { lockPermissions: false }).catch(() => {});
      }
      await channel.setPosition(99).catch(() => {});

      await channel.permissionOverwrites.set(overwrites).catch(() => {});
    }

    return channel;
  },

  /**
   * Logs bot ready status after restart (always sends a brand-new message!)
   */
  async logBotReady(guild, client) {
    try {
      const channel = await this.getOrCreateAdminLogChannel(guild);
      const now = Math.floor(Date.now() / 1000);
      const componentsV2 = require('../utils/componentsV2');
      const container = componentsV2.createContainer({
        accentColor: 0x2ECC71, // Green
        components: [
          componentsV2.createSection({
            text:
              `# 🟢 Bot Started & Ready (Restart Complete)\n\n` +
              `**AviBot** is fully initialized and operational after restart!\n` +
              `All event listeners, background workers, security locks, and slash commands are live.\n\n` +
              `**⚡ System Status:** \`ONLINE & OPERATIONAL\`\n` +
              `**⏱️ Boot Timestamp:** <t:${now}:F> (<t:${now}:R>)\n` +
              `**📊 Target Guild:** **${guild.name}** (\`${guild.memberCount}\` members)\n\n` +
              `### 🛡️ Active Systems\n` +
              `• 🔒 Anti-Bot 1-Click Verification & Isolation\n` +
              `• 🪤 Automated Honeypot Trap (#do-not-type)\n` +
              `• ⏱️ Chat Slowmodes & 15m Pic Slowmode\n` +
              `• 🎨 Interactive Role Picker in #roles\n` +
              `• 🏆 Multi-Interval Photo Leaderboards Worker\n` +
              `• 🤖 Gemini Vision Aviation & JetPhotos Verification\n` +
              `• 💬 Dual Leveling Engine (Activity + Spotter)`,
            accessory: componentsV2.createThumbnail('https://cdn-icons-png.flaticon.com/512/190/190411.png')
          })
        ]
      });

      // ALWAYS SEND A BRAND-NEW MESSAGE
      await componentsV2.sendToChannel(client, channel.id, [container]);
      console.log(`🛡️ Admin restart log published in #${channel.name} (${guild.name}) (Components V2)`);
    } catch (err) {
      console.error('Failed to send admin log:', err.message);
    }
  }
};

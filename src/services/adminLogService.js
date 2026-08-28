const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
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
      if (!channel) return;

      const now = Math.floor(Date.now() / 1000);

      const readyEmbed = new EmbedBuilder()
        .setColor(0x2ECC71) // Bright Green
        .setTitle('🟢 Bot Started & Ready (Restart Complete)')
        .setDescription(
          `**AviBot** is fully initialized and operational after restart!\n\n` +
          `All event listeners, background workers, security locks, and slash commands are live.`
        )
        .addFields(
          {
            name: '⚡ System Status',
            value: '`ONLINE & OPERATIONAL`',
            inline: true
          },
          {
            name: '⏱️ Boot Timestamp',
            value: `<t:${now}:F>\n(<t:${now}:R>)`,
            inline: true
          },
          {
            name: '📊 Target Guild',
            value: `**${guild.name}** (\`${guild.memberCount}\` members)`,
            inline: true
          },
          {
            name: '🛡️ Active Systems',
            value:
              '• 🔒 Anti-Bot 1-Click Verification & Isolation\n' +
              '• ⏱️ 3-Second Chat Slowmodes & 15m Pic Slowmode\n' +
              '• 🎨 Interactive Role Picker in `#roles`\n' +
              '• 🏆 Multi-Interval Photo Leaderboards Worker\n' +
              '• 🤖 Gemini Vision Aviation & JetPhotos Verification\n' +
              '• 💬 Dual Leveling Engine (Activity + Spotter)',
            inline: false
          }
        )
        .setFooter({ text: `${config.footerText} • Confidential Admin Logs` })
        .setTimestamp();

      // ALWAYS SEND A BRAND-NEW MESSAGE
      await channel.send({ embeds: [readyEmbed] });
      console.log(`🛡️ Admin restart log published in #${channel.name} (${guild.name})`);
    } catch (err) {
      console.error('Failed to send admin log:', err.message);
    }
  }
};

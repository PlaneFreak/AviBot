const { ChannelType, PermissionFlagsBits, AuditLogEvent } = require('discord.js');
const db = require('../database/db');
const componentsV2 = require('../utils/componentsV2');

const LEAVE_LOG_CHANNEL_NAME = '🚪ㆍleave-logs';

module.exports = {
  LEAVE_LOG_CHANNEL_NAME,

  /**
   * Finds or creates the leave log channel (Strictly ADMIN-ONLY, hidden from moderators & members)
   * Positioned inside the Staff category next to #🛡️ㆍadmin-logs.
   */
  async getOrCreateLeaveLogChannel(guild) {
    const channels = await guild.channels.fetch();
    let channel = channels.find(
      c => c && c.type === ChannelType.GuildText && (c.name === LEAVE_LOG_CHANNEL_NAME || c.name.toLowerCase().includes('leave-log'))
    );

    const everyoneRole = guild.roles.everyone;
    const verifiedRole = guild.roles.cache.find(r => r.name.toLowerCase().includes('verified'));
    const adminRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'admin' || r.permissions.has(PermissionFlagsBits.Administrator));
    const modRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'moderator' || r.name.toLowerCase().includes('mod'));
    const botMember = guild.members.me;

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

    if (modRole) {
      overwrites.push({
        id: modRole.id,
        deny: [PermissionFlagsBits.ViewChannel] // Strictly HIDDEN from moderators
      });
    }

    if (adminRole) {
      overwrites.push({
        id: adminRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.SendMessages
        ]
      });
    }

    if (botMember) {
      overwrites.push({
        id: botMember.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory
        ]
      });
    }

    if (!channel) {
      channel = await guild.channels.create({
        name: LEAVE_LOG_CHANNEL_NAME,
        type: ChannelType.GuildText,
        parent: staffCategory ? staffCategory.id : null,
        position: 98, // Positioned right above or next to admin-logs at bottom of Staff
        topic: 'Confidential Member Leave Logs. Only Server Administrators can view this channel.',
        permissionOverwrites: overwrites,
        reason: 'Auto-creation of Admin-Only Leave Logs channel'
      });
      console.log(`🚪 Created admin-only leave log channel #${channel.name} in ${guild.name}`);
    } else {
      // Ensure strict permissions and correct parent
      if (staffCategory && channel.parentId !== staffCategory.id) {
        await channel.setParent(staffCategory.id, { lockPermissions: false }).catch(() => {});
      }
      await channel.setPosition(98).catch(() => {});
      await channel.permissionOverwrites.set(overwrites).catch(() => {});
    }

    return channel;
  },

  /**
   * Dispatches a rich Components V2 leave card when a member departs or is removed
   */
  async logMemberLeave(member) {
    try {
      const guild = member.guild;
      const channel = await this.getOrCreateLeaveLogChannel(guild);
      if (!channel) return;

      const user = member.user || await member.client.users.fetch(member.id).catch(() => null) || { id: member.id, tag: `User (${member.id})`, username: member.id };

      // Avatar
      const avatarUrl = user.displayAvatarURL
        ? user.displayAvatarURL({ dynamic: true, size: 256 })
        : guild.iconURL() || 'https://cdn-icons-png.flaticon.com/512/190/190411.png';

      // Account Age
      const createdTimestamp = user.createdTimestamp ? Math.floor(user.createdTimestamp / 1000) : null;
      const accountAgeStr = createdTimestamp ? `<t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)` : '`Unknown`';

      // Join Date & Membership Duration
      const inviteData = db.getInviterOf(member.id, guild.id);
      let joinedTimestamp = member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
      if (!joinedTimestamp && inviteData?.joined_at) {
        joinedTimestamp = inviteData.joined_at;
      }

      const joinedStr = joinedTimestamp ? `<t:${joinedTimestamp}:F> (<t:${joinedTimestamp}:R>)` : '`Unknown`';

      let durationStr = 'Unknown';
      if (joinedTimestamp) {
        const durationSeconds = Math.max(0, Math.floor(Date.now() / 1000) - joinedTimestamp);
        const days = Math.floor(durationSeconds / 86400);
        const hours = Math.floor((durationSeconds % 86400) / 3600);
        const minutes = Math.floor((durationSeconds % 3600) / 60);
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0 || days > 0) parts.push(`${hours}h`);
        parts.push(`${minutes}m`);
        durationStr = parts.join(' ') || '< 1m';
      }

      // Roles prior to departure
      let rolesStr = '• None';
      if (member.roles?.cache) {
        const nonEveryoneRoles = member.roles.cache.filter(r => r.id !== guild.id);
        if (nonEveryoneRoles.size > 0) {
          rolesStr = nonEveryoneRoles.map(r => `<@&${r.id}>`).join(' ');
        }
      }

      // Invite & Referral Tracking
      let inviterStr = '• **Source:** Direct Join / Unknown Inviter';
      if (inviteData) {
        if (inviteData.inviter_id === 'VANITY_URL') {
          inviterStr =
            `• **Source:** Vanity URL (\`/planespotters\`)\n` +
            `• **Account Status:** ${inviteData.is_fake ? '⚠️ Flagged as Alt/Fake' : '✅ Verified Regular'}`;
        } else if (inviteData.inviter_id) {
          const inviterStats = db.getMemberInvites(inviteData.inviter_id, guild.id);
          inviterStr =
            `• **Invited by:** <@${inviteData.inviter_id}> (\`${inviteData.inviter_id}\`)\n` +
            `• **Invite Code Used:** \`${inviteData.invite_code || 'N/A'}\`\n` +
            `• **Inviter Total Stats:** \`${inviterStats.total}\` net invites (\`${inviterStats.regular}\` regular, \`${inviterStats.left}\` left, \`${inviterStats.fake}\` fake)\n` +
            `• **Account Status:** ${inviteData.is_fake ? '⚠️ Flagged as Alt/Fake' : '✅ Verified Real Member'}`;
        }
      }

      // Check Audit Log for Kick / Ban within the last 10 seconds
      let departureType = '🚪 **Voluntary Leave (Self-Leave)**';
      let departureDetails = null;

      try {
        if (guild.members.me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
          const fetchedLogs = await guild.fetchAuditLogs({ limit: 5 }).catch(() => null);
          if (fetchedLogs && fetchedLogs.entries.size > 0) {
            const now = Date.now();
            const kickOrBan = fetchedLogs.entries.find(entry =>
              (entry.action === AuditLogEvent.MemberKick || entry.action === AuditLogEvent.MemberBanAdd) &&
              entry.target?.id === member.id &&
              (now - entry.createdTimestamp) < 10000
            );

            if (kickOrBan) {
              if (kickOrBan.action === AuditLogEvent.MemberKick) {
                departureType = '🥾 **Kicked from Server**';
                departureDetails = `Kicked by <@${kickOrBan.executorId}> (\`${kickOrBan.executor?.tag || kickOrBan.executorId}\`)${kickOrBan.reason ? `\n• **Reason:** *${kickOrBan.reason}*` : ''}`;
              } else if (kickOrBan.action === AuditLogEvent.MemberBanAdd) {
                departureType = '🔨 **Banned from Server**';
                departureDetails = `Banned by <@${kickOrBan.executorId}> (\`${kickOrBan.executor?.tag || kickOrBan.executorId}\`)${kickOrBan.reason ? `\n• **Reason:** *${kickOrBan.reason}*` : ''}`;
              }
            }
          }
        }
      } catch (auditErr) {
        console.warn('Could not fetch audit logs for leave log:', auditErr.message);
      }

      const nowTs = Math.floor(Date.now() / 1000);

      const bodyText =
        `# 🚪 Member Departure Log\n\n` +
        `A member has departed from **${guild.name}**.\n\n` +
        `### 👤 Member Details\n` +
        `• **User:** <@${user.id}> (\`${user.tag || user.username || user.id}\`)\n` +
        `• **User ID:** \`${user.id}\`\n` +
        `• **Account Created:** ${accountAgeStr}\n\n` +
        `### ⏱️ Server Journey\n` +
        `• **Joined Server:** ${joinedStr}\n` +
        `• **Membership Duration:** \`${durationStr}\`\n` +
        `• **Departure Type:** ${departureType}\n` +
        (departureDetails ? `• **Action Details:** ${departureDetails}\n` : '') +
        `• **Departed At:** <t:${nowTs}:F> (<t:${nowTs}:R>)\n` +
        `• **Remaining Members:** \`${guild.memberCount}\` members\n\n` +
        `### 🎖️ Roles Held Prior to Departure\n` +
        `${rolesStr}\n\n` +
        `### 🔗 Invite & Referral Tracking\n` +
        `${inviterStr}`;

      const container = componentsV2.createContainer({
        accentColor: 0xED4245, // Soft Red
        components: [
          componentsV2.createSection({
            text: bodyText,
            accessory: componentsV2.createThumbnail(avatarUrl)
          })
        ]
      });

      await componentsV2.sendToChannel(member.client, channel.id, [container]);
      console.log(`🚪 Leave log dispatched for ${user.tag || user.id} in #${channel.name} (${guild.name})`);
    } catch (err) {
      console.error('Failed to dispatch member leave log:', err);
    }
  }
};

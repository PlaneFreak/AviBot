const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const db = require('../database/db');
const config = require('../config');
const appealHelper = require('./appealHelper');

const SUSPENDED_ROLE_NAME = '⛔ㆍSuspended';
const QUARANTINE_CATEGORY_NAME = '⛓️ ┃ QUARANTINE';

module.exports = {
  SUSPENDED_ROLE_NAME,
  QUARANTINE_CATEGORY_NAME,

  /**
   * Finds or creates the Suspended role
   */
  async getOrCreateSuspendedRole(guild) {
    let role = guild.roles.cache.find(r => r.name === SUSPENDED_ROLE_NAME || r.name.toLowerCase().includes('suspended'));
    if (!role) {
      role = await guild.roles.create({
        name: SUSPENDED_ROLE_NAME,
        color: 0x4F545C,
        hoist: true,
        permissions: [],
        reason: 'Quarantine role for suspended members'
      });

      // Update regular public channels to deny ViewChannel for this role
      const channels = await guild.channels.fetch();
      for (const [, ch] of channels) {
        if (ch && ch.type !== ChannelType.GuildCategory && !ch.name.startsWith('jail-')) {
          await ch.permissionOverwrites.edit(role, {
            ViewChannel: false,
            SendMessages: false,
            Connect: false
          }).catch(() => {});
        }
      }
    }
    return role;
  },

  /**
   * Finds or creates the Quarantine category located at the very bottom
   */
  async getOrCreateQuarantineCategory(guild) {
    const channels = await guild.channels.fetch();
    let category = channels.find(
      c => c && c.type === ChannelType.GuildCategory && (c.name === QUARANTINE_CATEGORY_NAME || c.name.toLowerCase().includes('quarantine') || c.name.toLowerCase().includes('jail'))
    );

    const adminRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'admin');
    const modRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'moderator');
    const everyoneRole = guild.roles.everyone;

    const overwrites = [
      {
        id: everyoneRole.id,
        deny: [PermissionFlagsBits.ViewChannel]
      }
    ];

    if (modRole) {
      overwrites.push({
        id: modRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      });
    }

    if (adminRole) {
      overwrites.push({
        id: adminRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      });
    }

    if (!category) {
      // Find highest position to place at the very bottom
      const maxPosition = Math.max(...channels.filter(c => c && c.type === ChannelType.GuildCategory).map(c => c.position || 0), 0);

      category = await guild.channels.create({
        name: QUARANTINE_CATEGORY_NAME,
        type: ChannelType.GuildCategory,
        position: maxPosition + 1,
        permissionOverwrites: overwrites,
        reason: 'Quarantine category creation'
      });
    }

    return category;
  },

  /**
   * Quarantines / Suspends a member in their own dedicated jail channel: jail-00001
   */
  async quarantineMember(member, type, reason, moderator) {
    const guild = member.guild;
    const suspendedRole = await this.getOrCreateSuspendedRole(guild);
    const quarantineCategory = await this.getOrCreateQuarantineCategory(guild);

    // Save existing role IDs (excluding @everyone and managed bot roles)
    const savedRoles = member.roles.cache
      .filter(r => r.id !== guild.id && !r.managed)
      .map(r => r.id);

    // Remove current roles and assign Suspended role
    try {
      await member.roles.set([suspendedRole.id], `Quarantined for ${type} by ${moderator.tag}`);
    } catch (err) {
      console.warn('Could not set roles to suspended only:', err.message);
      await member.roles.add(suspendedRole.id).catch(() => {});
    }

    // Generate 5-digit case number: jail-00001
    const caseNumber = db.getNextCaseNumber(guild.id);
    const formattedCase = String(caseNumber).padStart(5, '0');
    const jailChannelName = `jail-${formattedCase}`;

    const adminRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'admin');
    const modRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'moderator');
    const everyoneRole = guild.roles.everyone;

    const channelOverwrites = [
      {
        id: everyoneRole.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory
        ],
        deny: [
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AddReactions,
          PermissionFlagsBits.CreatePublicThreads,
          PermissionFlagsBits.CreatePrivateThreads
        ]
      }
    ];

    if (modRole) {
      channelOverwrites.push({
        id: modRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      });
    }

    if (adminRole) {
      channelOverwrites.push({
        id: adminRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      });
    }

    // Create unique jail channel at bottom
    const jailChannel = await guild.channels.create({
      name: jailChannelName,
      type: ChannelType.GuildText,
      parent: quarantineCategory.id,
      topic: `Dedicated quarantine channel for ${member.user.tag} (Case #${formattedCase}) • 5-day appeal period.`,
      permissionOverwrites: channelOverwrites,
      reason: `Quarantine jail channel for ${member.user.tag}`
    });

    const expiresAtMs = Date.now() + 5 * 24 * 60 * 60 * 1000; // 5 days
    const expiresAtSeconds = Math.floor(expiresAtMs / 1000);

    const isBan = type === 'ban';
    const titleEmoji = isBan ? '🔨' : '👢';
    const actionName = isBan ? 'Permanent Ban' : 'Server Kick';

    // Embed for the dedicated Jail Channel & DM
    const quarantineEmbed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle(`${titleEmoji} Account Suspended • ${actionName} Pending`)
      .setDescription(
        `Hello ${member}, your server access has been quarantined.\n\n` +
        `This is your private appeal channel: **#${jailChannelName}**.\n` +
        `You have **5 days** (<t:${expiresAtSeconds}:R>) to submit an appeal before your ${actionName.toLowerCase()} is finalized.`
      )
      .addFields(
        { name: '⚠️ Punishment', value: `\`${type.toUpperCase()}\``, inline: true },
        { name: '🛡️ Moderator', value: moderator.tag, inline: true },
        { name: '📁 Case Number', value: `\`#${formattedCase}\``, inline: true },
        { name: '⏳ Expiration / Deadline', value: `<t:${expiresAtSeconds}:F> (<t:${expiresAtSeconds}:R>)`, inline: false },
        { name: '📝 Reason', value: reason || 'No reason provided', inline: false },
        {
          name: '📌 How to Appeal',
          value: '• Click **Submit Appeal** to fill out your appeal form.\n• Moderation staff can enable two-way live chat using the **Chat Activate** button if required.'
        }
      )
      .setFooter({ text: `${config.footerText} • 5-Day Appeal Window • Case #${formattedCase}` })
      .setTimestamp();

    const jailActionRow = appealHelper.createJailActionRow(guild.id, type, member.id);
    const dmAppealRow = appealHelper.createAppealButton(guild.id, type);

    // Post in dedicated Jail Channel
    const hubMsg = await jailChannel.send({
      content: `${member}`,
      embeds: [quarantineEmbed],
      components: [jailActionRow]
    });

    // Try sending DM
    await member.send({
      embeds: [quarantineEmbed],
      components: [dmAppealRow]
    }).catch(() => {});

    // Save in SQLite DB
    await db.createPunishment({
      userId: member.id,
      guildId: guild.id,
      type: type,
      reason: reason,
      moderatorId: moderator.id,
      moderatorTag: moderator.tag,
      savedRoles: savedRoles,
      expiresAt: new Date(expiresAtMs),
      hubMessageId: hubMsg.id,
      jailChannelId: jailChannel.id,
      caseNumber: caseNumber
    });

    return { expiresAtSeconds, jailChannel, caseNumber: formattedCase };
  },

  /**
   * Restores a member and deletes their jail channel
   */
  async restoreMember(guild, userId) {
    const punishment = await db.getActivePunishment(userId, guild.id);
    const member = await guild.members.fetch(userId).catch(() => null);

    if (punishment) {
      await db.updatePunishmentStatus(punishment.id, 'accepted');

      // Delete jail channel
      if (punishment.jail_channel_id) {
        const jailChannel = guild.channels.cache.get(punishment.jail_channel_id) || await guild.channels.fetch(punishment.jail_channel_id).catch(() => null);
        if (jailChannel) {
          await jailChannel.delete('Appeal accepted / case resolved').catch(() => {});
        }
      }
    }

    if (member) {
      const suspendedRole = guild.roles.cache.find(r => r.name === SUSPENDED_ROLE_NAME || r.name.toLowerCase().includes('suspended'));
      if (suspendedRole) {
        await member.roles.remove(suspendedRole.id).catch(() => {});
      }

      // Restore saved roles
      if (punishment && punishment.saved_roles) {
        try {
          const roleIds = JSON.parse(punishment.saved_roles);
          const validRoleIds = roleIds.filter(id => guild.roles.cache.has(id));
          if (validRoleIds.length > 0) {
            await member.roles.add(validRoleIds).catch(() => {});
          }
        } catch (err) {
          console.error('Failed to parse saved roles:', err);
        }
      }
    }
  },

  /**
   * Finalizes the punishment and deletes their jail channel
   */
  async finalizePunishment(guild, userId, type, reason) {
    const punishment = await db.getActivePunishment(userId, guild.id);
    if (punishment) {
      await db.updatePunishmentStatus(punishment.id, 'executed');

      // Delete jail channel
      if (punishment.jail_channel_id) {
        const jailChannel = guild.channels.cache.get(punishment.jail_channel_id) || await guild.channels.fetch(punishment.jail_channel_id).catch(() => null);
        if (jailChannel) {
          await jailChannel.delete(`Punishment finalized (${reason})`).catch(() => {});
        }
      }
    }

    if (type === 'ban' || type === 'jail') {
      await guild.members.ban(userId, { reason: `Quarantine expired / Appeal rejected: ${reason}` }).catch(() => {});
    } else {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member) {
        await member.kick(`Quarantine expired / Appeal rejected: ${reason}`).catch(() => {});
      }
    }
  }
};

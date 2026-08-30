const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

// Key / Significant permissions mapped to human-readable labels
const PERMISSION_NAMES = {
  Administrator: '👑 Administrator',
  ManageGuild: '⚙️ Manage Server',
  ManageRoles: '🏷️ Manage Roles',
  ManageChannels: '📁 Manage Channels',
  KickMembers: '👢 Kick Members',
  BanMembers: '🔨 Ban Members',
  ModerateMembers: '⏳ Timeout Members',
  ManageMessages: '🗑️ Manage Messages',
  ViewAuditLog: '📜 View Audit Log',
  MentionEveryone: '📢 Mention @everyone',
  ManageWebhooks: '🌐 Manage Webhooks',
  ManageGuildExpressions: '😀 Manage Emojis & Stickers',
  MuteMembers: '🔇 Mute Members',
  DeafenMembers: '🔈 Deafen Members',
  MoveMembers: '🔀 Move Members',
  PrioritySpeaker: '🎙️ Priority Speaker',
  SendMessages: '💬 Send Messages',
  EmbedLinks: '🔗 Embed Links',
  AttachFiles: '📎 Attach Files',
  AddReactions: '👍 Add Reactions',
  UseExternalEmojis: '🌟 Use External Emojis',
  UseExternalStickers: '🏷️ Use External Stickers',
  Connect: '🔊 Connect Voice',
  Speak: '🗣️ Speak Voice',
  ViewChannel: '👁️ View Channels',
  ReadMessageHistory: '📖 Read History'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Display comprehensive information, members, and permissions of a role')
    .addRoleOption(opt =>
      opt
        .setName('role')
        .setDescription('The role to inspect')
        .setRequired(true)
    ),

  async execute(interaction) {
    const role = interaction.options.getRole('role');
    const guild = interaction.guild;

    // Fetch members to ensure accurate count
    await guild.members.fetch().catch(() => {});

    const membersWithRole = role.members;
    const memberCount = membersWithRole.size;
    const memberPercentage = guild.memberCount > 0 ? ((memberCount / guild.memberCount) * 100).toFixed(1) : '0.0';

    const createdSeconds = Math.floor(role.createdTimestamp / 1000);
    const hexColor = role.hexColor === '#000000' ? '#Default' : role.hexColor.toUpperCase();

    // Permission Analysis
    const permissions = role.permissions.toArray();
    let permsDisplay = '';

    if (role.permissions.has(PermissionFlagsBits.Administrator)) {
      permsDisplay = '👑 **Administrator** *(Has all server permissions bypassed)*';
    } else if (permissions.length === 0) {
      permsDisplay = '*No special permissions granted (Standard Member permissions)*';
    } else {
      // Highlight recognized key permissions
      const formattedPerms = permissions.map(p => PERMISSION_NAMES[p] || `• \`${p}\``);
      permsDisplay = formattedPerms.join('\n');
    }

    // Sample Members (up to 8)
    let memberListDisplay = '';
    if (memberCount === 0) {
      memberListDisplay = '*No members currently have this role.*';
    } else {
      const sample = Array.from(membersWithRole.values()).slice(0, 8);
      const sampleText = sample.map(m => `${m}`).join(', ');
      const remaining = memberCount - sample.length;
      memberListDisplay = sampleText + (remaining > 0 ? ` *...and ${remaining} more*` : '');
    }

    const embed = new EmbedBuilder()
      .setColor(role.color || config.colors.primary)
      .setTitle(`🏷️ Role Information • ${role.name}`)
      .setThumbnail(role.iconURL({ size: 512 }) || null)
      .addFields(
        {
          name: '📋 General Details',
          value:
            `• **Role Mention:** ${role}\n` +
            `• **Role ID:** \`${role.id}\`\n` +
            `• **Color:** \`${hexColor}\`\n` +
            `• **Created:** <t:${createdSeconds}:F> (<t:${createdSeconds}:R>)\n` +
            `• **Position:** \`#${role.position}\` / \`${guild.roles.cache.size}\` in hierarchy`,
          inline: true
        },
        {
          name: '⚙️ Settings & Flags',
          value:
            `• **Separated (Hoist):** ${role.hoist ? '✅ Yes' : '❌ No'}\n` +
            `• **Mentionable:** ${role.mentionable ? '✅ Yes' : '❌ No'}\n` +
            `• **Managed (Bot/Integration):** ${role.managed ? '🤖 Yes' : '❌ No'}\n` +
            `• **Members:** \`${memberCount}\` (${memberPercentage}% of server)`,
          inline: true
        },
        {
          name: `👥 Members (${memberCount})`,
          value: memberListDisplay,
          inline: false
        },
        {
          name: `🛡️ Permissions (${permissions.length})`,
          value: permsDisplay.length > 1024 ? permsDisplay.slice(0, 1020) + '...' : permsDisplay,
          inline: false
        }
      )
      .setFooter({ text: `${config.footerText} • Role Inspector` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};

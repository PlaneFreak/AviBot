const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
const config = require('../../config');

function getKeyPermissions(member) {
  const keyPerms = [];
  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return ['Administrator (All Permissions)'];
  }
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) keyPerms.push('Manage Server');
  if (member.permissions.has(PermissionFlagsBits.ManageRoles)) keyPerms.push('Manage Roles');
  if (member.permissions.has(PermissionFlagsBits.ManageChannels)) keyPerms.push('Manage Channels');
  if (member.permissions.has(PermissionFlagsBits.BanMembers)) keyPerms.push('Ban Members');
  if (member.permissions.has(PermissionFlagsBits.KickMembers)) keyPerms.push('Kick Members');
  if (member.permissions.has(PermissionFlagsBits.ModerateMembers)) keyPerms.push('Moderate Members (Timeout)');
  if (member.permissions.has(PermissionFlagsBits.ManageMessages)) keyPerms.push('Manage Messages');
  if (member.permissions.has(PermissionFlagsBits.MentionEveryone)) keyPerms.push('Mention Everyone');

  return keyPerms.length > 0 ? keyPerms : ['Standard Member Permissions'];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whois')
    .setDescription('Displays detailed information about a member or yourself')
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to view information about')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target') || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    const userCreatedTimestamp = Math.floor(targetUser.createdTimestamp / 1000);
    const isBot = targetUser.bot ? '🤖 Yes (Bot)' : '👤 No (Human)';
    
    let mdText = `# 👤 User Information • ${targetUser.tag}\n\n`;
    
    mdText += `**🆔 Identity**\n`;
    mdText += `• **Mention:** ${targetUser}\n`;
    mdText += `• **User ID:** \`${targetUser.id}\`\n`;
    mdText += `• **Account Type:** ${isBot}\n`;
    mdText += `• **Nickname:** ${member && member.nickname ? `\`${member.nickname}\`` : 'None'}\n\n`;
    
    mdText += `**📅 Dates & Timelines**\n`;
    mdText += `• **Account Created:** <t:${userCreatedTimestamp}:F> (<t:${userCreatedTimestamp}:R>)\n`;
    mdText += `• **Joined Server:** ${
      member && member.joinedTimestamp
        ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`
        : 'Not in this server'
    }\n\n`;

    if (member) {
      // Roles
      const roles = member.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => `${r}`);

      const rolesDisplay = roles.length > 0
        ? (roles.length > 15 ? `${roles.slice(0, 15).join(', ')} ... and ${roles.length - 15} more` : roles.join(', '))
        : 'No Roles';

      // Timed out check
      const isTimedOut = member.isCommunicationDisabled()
        ? `⚠️ Yes (Until <t:${Math.floor(member.communicationDisabledUntilTimestamp / 1000)}:R>)`
        : '✅ No';

      mdText += `**🎭 Roles [${roles.length}]**\n${rolesDisplay}\n\n`;
      mdText += `**🛡️ Key Permissions & Status**\n`;
      mdText += `• **Highest Role:** ${member.roles.highest}\n`;
      mdText += `• **Timed Out:** ${isTimedOut}\n`;
      mdText += `• **Permissions:** ${getKeyPermissions(member).join(', ')}\n\n`;
    }
    
    mdText += `*${config.footerText}* <t:${Math.floor(Date.now() / 1000)}:R>`;

    const container = componentsV2.createContainer({
      accentColor: member ? member.displayColor || config.colors.primary : config.colors.primary,
      components: [
        componentsV2.createSection({
          text: mdText,
          accessory: componentsV2.createThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
        })
      ]
    });

    await componentsV2.replyToInteraction(interaction, [container]);
  }
};

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const adminLogService = require('../../services/adminLogService');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('allowinvites')
    .setDescription('Grant a user permission to post a specific amount of Discord invite links (e.g. Paid Ads)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('The user to grant invite allowances to')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName('amount')
        .setDescription('Number of allowed invite links (0 to revoke)')
        .setMinValue(0)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('reason')
        .setDescription('Reason or ad partner note (e.g. Paid Ad, Server Partnership)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason') || 'Sponsored Partnership / Paid Advertisement';
    const guild = interaction.guild;

    db.setAllowedInvites(targetUser.id, guild.id, amount, interaction.user.tag, reason);

    const embed = new EmbedBuilder()
      .setColor(amount > 0 ? config.colors.success : config.colors.warning)
      .setTitle('🔗 Discord Invite Allowance Updated')
      .setDescription(
        amount > 0
          ? `✅ **${targetUser}** (\`${targetUser.tag}\`) has been granted **${amount}** allowed Discord invite link(s).\n\n` +
            `📝 **Reason / Note:** *${reason}*\n` +
            `🛡️ *The Anti-Spam filter will automatically allow the next ${amount} invite(s) posted by this user.*`
          : `🛑 Invite permissions for **${targetUser}** have been **revoked** (Quota: 0).`
      )
      .setFooter({ text: `${config.footerText} • Sponsored Ad Management` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Log to Admin Logs
    const adminChannel = await adminLogService.getOrCreateAdminLogChannel(guild);
    if (adminChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(amount > 0 ? 0x2ECC71 : 0xE67E22)
        .setTitle('🔗 Invite Quota Modified')
        .setDescription(
          `**User:** ${targetUser} (\`${targetUser.id}\`)\n` +
          `**New Quota:** ${amount} invite(s)\n` +
          `**Moderator:** ${interaction.user} (\`${interaction.user.tag}\`)\n` +
          `**Reason:** ${reason}`
        )
        .setTimestamp();

      await adminChannel.send({ embeds: [logEmbed] }).catch(() => {});
    }
  }
};

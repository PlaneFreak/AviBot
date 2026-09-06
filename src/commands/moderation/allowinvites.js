const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
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

    const desc = amount > 0
      ? `✅ **${targetUser}** (\`${targetUser.tag}\`) has been granted **${amount}** allowed Discord invite link(s).\n\n📝 **Reason / Note:** *${reason}*\n🛡️ *The Anti-Spam filter will automatically allow the next ${amount} invite(s) posted by this user.*`
      : `🛑 Invite permissions for **${targetUser}** have been **revoked** (Quota: 0).`;

    const container = componentsV2.createContainer({
      accentColor: amount > 0 ? config.colors.success : config.colors.warning,
      components: [
        componentsV2.createSection({
          text: `# 🔗 Discord Invite Allowance Updated\n\n${desc}\n\n*${config.footerText} • Sponsored Ad Management*`
        })
      ]
    });

    componentsV2.replyToInteraction(interaction, [container]);

    // Log to Admin Logs
    const adminChannel = await adminLogService.getOrCreateAdminLogChannel(guild);
    if (adminChannel) {
      const logContainer = componentsV2.createContainer({
        accentColor: amount > 0 ? 0x2ECC71 : 0xE67E22,
        components: [
          componentsV2.createSection({
            text: `# 🔗 Invite Quota Modified\n\n**User:** ${targetUser} (\`${targetUser.id}\`)\n**New Quota:** ${amount} invite(s)\n**Moderator:** ${interaction.user} (\`${interaction.user.tag}\`)\n**Reason:** ${reason}`
          })
        ]
      });

      componentsV2.sendToChannel(interaction.client, adminChannel.id, [logContainer]);
    }
  }
};

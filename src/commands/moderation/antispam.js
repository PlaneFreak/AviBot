const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antispam')
    .setDescription('View anti-spam filter settings and status')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const container = componentsV2.createContainer({
      accentColor: config.colors.primary,
      components: [
        componentsV2.createSection({
          text: `# 🛡️ Anti-Spam Protection Suite\n\n` +
                `The anti-spam engine is active 24/7 across all text channels:\n\n` +
                `**⚡ Rapid Message Flood**\nMax **5 messages** in **4 seconds** ➔ Message deletion & 5m Timeout\n\n` +
                `**🔁 Duplicate Text Spam**\nMax **3 identical messages** in 10 seconds ➔ Message deletion & 5m Timeout\n\n` +
                `**📢 Mass Mention Spam**\nMax **4 user/role mentions** or unauthorized \`@everyone\` ➔ Message deletion & 5m Timeout\n\n` +
                `**🔗 Unauthorized Discord Invites**\nDiscord invite links (\`discord.gg/...\`) from non-staff are automatically blocked & removed\n\n` +
                `**📜 Wall of Text / Line Flood**\nMessages with >12 line breaks are auto-deleted with a warning\n\n` +
                `**🛡️ Role Bypasses**\nStaff (\`Admin\`, \`Moderator\`) and \`🧪ㆍTester\` roles bypass filters\n\n` +
                `*${config.footerText} • Realtime Chat Defense*`
        })
      ]
    });

    return componentsV2.replyToInteraction(interaction, [container], { ephemeral: true });
  }
};

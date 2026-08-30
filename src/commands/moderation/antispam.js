const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antispam')
    .setDescription('View anti-spam filter settings and status')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🛡️ Anti-Spam Protection Suite')
      .setDescription('The anti-spam engine is active 24/7 across all text channels:')
      .addFields(
        {
          name: '⚡ Rapid Message Flood',
          value: 'Max **5 messages** in **4 seconds** ➔ Message deletion & 5m Timeout',
          inline: false
        },
        {
          name: '🔁 Duplicate Text Spam',
          value: 'Max **3 identical messages** in 10 seconds ➔ Message deletion & 5m Timeout',
          inline: false
        },
        {
          name: '📢 Mass Mention Spam',
          value: 'Max **4 user/role mentions** or unauthorized `@everyone` ➔ Message deletion & 5m Timeout',
          inline: false
        },
        {
          name: '🔗 Unauthorized Discord Invites',
          value: 'Discord invite links (`discord.gg/...`) from non-staff are automatically blocked & removed',
          inline: false
        },
        {
          name: '📜 Wall of Text / Line Flood',
          value: 'Messages with >12 line breaks are auto-deleted with a warning',
          inline: false
        },
        {
          name: '🛡️ Role Bypasses',
          value: 'Staff (`Admin`, `Moderator`) and `🧪ㆍTester` roles bypass filters',
          inline: false
        }
      )
      .setFooter({ text: `${config.footerText} • Realtime Chat Defense` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], flags: 64 });
  }
};

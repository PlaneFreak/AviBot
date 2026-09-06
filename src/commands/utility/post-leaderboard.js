const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
const leaderboardService = require('../../services/leaderboardService');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('post-leaderboard')
    .setDescription('Publishes the photo ranking leaderboard for a chosen period')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName('period')
        .setDescription('Leaderboard interval to generate and post')
        .setRequired(true)
        .addChoices(
          { name: '☀️ Daily (Past 24h)', value: 'daily' },
          { name: '⚡ 3-Day (Past 72h)', value: 'three_days' },
          { name: '🏆 Weekly (Past 7 Days)', value: 'weekly' },
          { name: '👑 Monthly (Past 30 Days)', value: 'monthly' },
          { name: '🌌 Yearly (Past 365 Days)', value: 'yearly' }
        )
    ),

  async execute(interaction) {
    const period = interaction.options.getString('period');
    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await leaderboardService.postLeaderboard(interaction.guild, period, true);
      const conf = leaderboardService.PERIOD_CONFIG[period];

      const mdText = `# ${config.emojis.success} Leaderboard Posted\n\nSuccessfully posted the **${conf.name}** in ${result.channel}!\n\n*${config.footerText}*`;
      const container = componentsV2.createContainer({
        accentColor: config.colors.success,
        components: [
          componentsV2.createSection({ text: mdText })
        ]
      });

      return componentsV2.editInteractionReply(interaction, [container]);
    } catch (err) {
      console.error('Error posting manual leaderboard:', err);
      return interaction.editReply({
        content: `${config.emojis.error} Failed to post leaderboard: ${err.message}`
      });
    }
  }
};

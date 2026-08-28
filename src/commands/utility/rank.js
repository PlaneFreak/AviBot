const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const levelHelper = require('../../utils/levelHelper');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Displays a member’s spotter rank, level, and XP progression')
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member whose rank you want to view (defaults to yourself)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guild = interaction.guild;

    const stats = db.getUserStats(targetUser.id, guild.id);
    const levelData = levelHelper.calculateLevelData(stats.profile.xp);

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({
        name: `${targetUser.tag}’s Spotter Profile`,
        iconURL: targetUser.displayAvatarURL({ dynamic: true })
      })
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        {
          name: '🎖️ Rank & Title',
          value: `**${levelData.rankTitle}**\n🏆 **#${stats.rank}** on server`,
          inline: true
        },
        {
          name: '⭐ Level & Total XP',
          value: `**Level ${levelData.level}**\n✨ **${levelData.totalXP}** Total XP`,
          inline: true
        },
        {
          name: '📈 Level Progress',
          value: `\`${levelData.progressBar}\`\n**${levelData.xpInCurrentLevel}** / **${levelData.xpNeededForNext} XP** to Level ${levelData.level + 1}`,
          inline: false
        },
        {
          name: '📸 Photo Performance',
          value: `🖼️ **${stats.totalSubmissions}** Submissions\n⭐ **${stats.totalPointsEarned}** Total Points Earned`,
          inline: true
        }
      )
      .setFooter({ text: `${config.footerText} • Earn XP from Daily & Weekly Leaderboards!` })
      .setTimestamp();

    if (stats.bestPhoto) {
      const avg = stats.bestPhoto.vote_count > 0 ? (stats.bestPhoto.total_rating_sum / stats.bestPhoto.vote_count).toFixed(1) : '0.0';
      embed.addFields({
        name: '🌟 Personal Best Submission',
        value: `🏆 **${stats.bestPhoto.total_points} pts** (⭐ ${avg}/10 • 🗳️ ${stats.bestPhoto.vote_count} votes)${stats.bestPhoto.caption ? `\n📝 *"${stats.bestPhoto.caption}"*` : ''}`,
        inline: false
      });
      // Optionally show best photo in image if present
      if (stats.bestPhoto.image_url) {
        embed.setImage(stats.bestPhoto.image_url);
      }
    }

    await interaction.reply({ embeds: [embed] });
  }
};

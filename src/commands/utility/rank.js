const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const levelHelper = require('../../utils/levelHelper');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Displays a member’s dual profile: Chat Activity Level & Planespotter Photo Level')
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
    const profile = stats.profile;

    // 1. Photo Spotter XP System
    const spotterLevelData = levelHelper.calculateLevelData(profile.xp || 0);

    // 2. Chat Activity XP System (Medium-to-Hard scaling)
    const chatLevelData = levelHelper.calculateChatLevelData(profile.chat_xp || 0);

    // 3. JetPhotos status
    const jpVerified = profile.jp_verified;
    const jpPhotos = profile.jp_photo_count || 0;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({
        name: `${targetUser.tag}’s Aviator Profile`,
        iconURL: targetUser.displayAvatarURL({ dynamic: true })
      })
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        {
          name: '💬 Community Activity Level',
          value:
            `🎖️ **${chatLevelData.rankTitle}** • **Level ${chatLevelData.level}**\n` +
            `✨ **${chatLevelData.totalXP}** Chat XP • 💬 **${profile.messages_count || 0}** Messages\n` +
            `📊 \`${chatLevelData.progressBar}\` (${chatLevelData.xpInCurrentLevel}/${chatLevelData.xpNeededForNext} XP to Lvl ${chatLevelData.level + 1})`,
          inline: false
        },
        {
          name: '📸 Planespotter Photo Level',
          value:
            `🎖️ **${spotterLevelData.rankTitle}** • **Level ${spotterLevelData.level}**\n` +
            `🏆 **#${stats.rank}** on server • ✨ **${spotterLevelData.totalXP}** Photo XP\n` +
            `🖼️ **${stats.totalSubmissions}** Submissions • ⭐ **${stats.totalPointsEarned}** Points\n` +
            `📊 \`${spotterLevelData.progressBar}\``,
          inline: false
        }
      );

    if (jpVerified) {
      embed.addFields({
        name: '✈️ JetPhotos Status',
        value: `✅ Verified as \`${profile.jp_username || 'Photographer'}\` with **${jpPhotos} accepted photos** (${profile.jp_acceptance_rate || 'verified rate'})`,
        inline: false
      });
    }

    if (stats.bestPhoto) {
      const avg = stats.bestPhoto.vote_count > 0 ? (stats.bestPhoto.total_rating_sum / stats.bestPhoto.vote_count).toFixed(1) : '0.0';
      embed.addFields({
        name: '🌟 Personal Best Spotter Submission',
        value: `🏆 **${stats.bestPhoto.total_points} pts** (⭐ ${avg}/10 • 🗳️ ${stats.bestPhoto.vote_count} votes)${stats.bestPhoto.caption ? `\n📝 *"${stats.bestPhoto.caption}"*` : ''}`,
        inline: false
      });

      if (stats.bestPhoto.image_url) {
        embed.setImage(stats.bestPhoto.image_url);
      }
    }

    embed.setFooter({ text: `${config.footerText} • Chat to level up activity | Upload photos to level up spotter rank!` });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};

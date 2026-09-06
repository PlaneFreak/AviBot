const { SlashCommandBuilder } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
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

    let mdText = `**${targetUser.tag}’s Aviator Profile**\n\n`;
    mdText += `**💬 Community Activity Level**\n`;
    mdText += `🎖️ **${chatLevelData.rankTitle}** • **Level ${chatLevelData.level}**\n`;
    mdText += `✨ **${chatLevelData.totalXP}** Chat XP • 💬 **${profile.messages_count || 0}** Messages\n`;
    mdText += `📊 \`${chatLevelData.progressBar}\` (${chatLevelData.xpInCurrentLevel}/${chatLevelData.xpNeededForNext} XP to Lvl ${chatLevelData.level + 1})\n\n`;

    mdText += `**📸 Planespotter Photo Level**\n`;
    mdText += `🎖️ **${spotterLevelData.rankTitle}** • **Level ${spotterLevelData.level}**\n`;
    mdText += `🏆 **#${stats.rank}** on server • ✨ **${spotterLevelData.totalXP}** Photo XP\n`;
    mdText += `🖼️ **${stats.totalSubmissions}** Submissions • ⭐ **${stats.totalPointsEarned}** Points\n`;
    mdText += `📊 \`${spotterLevelData.progressBar}\`\n\n`;

    if (jpVerified) {
      mdText += `**✈️ JetPhotos Status**\n✅ Verified as \`${profile.jp_username || 'Photographer'}\` with **${jpPhotos} accepted photos** (${profile.jp_acceptance_rate || 'verified rate'})\n\n`;
    }

    const components = [];

    if (stats.bestPhoto) {
      const avg = stats.bestPhoto.vote_count > 0 ? (stats.bestPhoto.total_rating_sum / stats.bestPhoto.vote_count).toFixed(1) : '0.0';
      mdText += `**🌟 Personal Best Spotter Submission**\n`;
      mdText += `🏆 **${stats.bestPhoto.total_points} pts** (⭐ ${avg}/10 • 🗳️ ${stats.bestPhoto.vote_count} votes)${stats.bestPhoto.caption ? `\n📝 *"${stats.bestPhoto.caption}"*` : ''}\n\n`;
      
      if (stats.bestPhoto.image_url) {
        components.push(componentsV2.createMediaGallery([stats.bestPhoto.image_url]));
      }
    }

    mdText += `*${config.footerText} • Chat to level up activity | Upload photos to level up spotter rank!* <t:${Math.floor(Date.now() / 1000)}:R>`;

    components.push(
      componentsV2.createSection({
        text: mdText,
        accessory: componentsV2.createThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      })
    );

    const container = componentsV2.createContainer({
      accentColor: config.colors.primary,
      components: components
    });

    await componentsV2.replyToInteraction(interaction, [container]);
  }
};

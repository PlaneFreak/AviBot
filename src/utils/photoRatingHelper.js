const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

module.exports = {
  /**
   * Builds the interactive photo rating embed
   */
  createPhotoEmbed(author, imageUrl, caption = '', stats = { totalPoints: 0, voteCount: 0, averageRating: '0.0' }) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({
        name: `✈️ Spotter Shot by ${author.tag || author.username}`,
        iconURL: author.displayAvatarURL({ dynamic: true })
      })
      .setImage(imageUrl)
      .setFooter({ text: `${config.footerText} • Rate this photo 1-10 below!` })
      .setTimestamp();

    if (caption && caption.trim().length > 0) {
      embed.setDescription(`📝 *"${caption.trim()}"*`);
    }

    const avg = stats.voteCount > 0 ? stats.averageRating : '—';
    const starDisplay = stats.voteCount > 0 ? '⭐'.repeat(Math.min(5, Math.max(1, Math.round(parseFloat(stats.averageRating) / 2)))) : '☆☆☆☆☆';

    embed.addFields(
      {
        name: '🏆 Score Points',
        value: `**${stats.totalPoints}** pts`,
        inline: true
      },
      {
        name: '📊 Average Rating',
        value: `**${avg}/10** ${starDisplay}`,
        inline: true
      },
      {
        name: '🗳️ Total Votes',
        value: `**${stats.voteCount}** votes`,
        inline: true
      }
    );

    return embed;
  },

  /**
   * Generates 2 rows of buttons for ratings 1-10
   */
  createRatingButtons(disabled = false) {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rate_photo_1').setLabel('1').setStyle(ButtonStyle.Secondary).setEmoji('1️⃣').setDisabled(disabled),
      new ButtonBuilder().setCustomId('rate_photo_2').setLabel('2').setStyle(ButtonStyle.Secondary).setEmoji('2️⃣').setDisabled(disabled),
      new ButtonBuilder().setCustomId('rate_photo_3').setLabel('3').setStyle(ButtonStyle.Secondary).setEmoji('3️⃣').setDisabled(disabled),
      new ButtonBuilder().setCustomId('rate_photo_4').setLabel('4').setStyle(ButtonStyle.Secondary).setEmoji('4️⃣').setDisabled(disabled),
      new ButtonBuilder().setCustomId('rate_photo_5').setLabel('5').setStyle(ButtonStyle.Secondary).setEmoji('5️⃣').setDisabled(disabled)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rate_photo_6').setLabel('6').setStyle(ButtonStyle.Primary).setEmoji('6️⃣').setDisabled(disabled),
      new ButtonBuilder().setCustomId('rate_photo_7').setLabel('7').setStyle(ButtonStyle.Primary).setEmoji('7️⃣').setDisabled(disabled),
      new ButtonBuilder().setCustomId('rate_photo_8').setLabel('8').setStyle(ButtonStyle.Primary).setEmoji('8️⃣').setDisabled(disabled),
      new ButtonBuilder().setCustomId('rate_photo_9').setLabel('9').setStyle(ButtonStyle.Primary).setEmoji('9️⃣').setDisabled(disabled),
      new ButtonBuilder().setCustomId('rate_photo_10').setLabel('10 (+2 Bonus)').setStyle(ButtonStyle.Success).setEmoji('🌟').setDisabled(disabled)
    );

    return [row1, row2];
  }
};

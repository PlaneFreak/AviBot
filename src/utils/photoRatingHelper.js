const componentsV2 = require('./componentsV2');
const config = require('../config');

module.exports = {
  /**
   * Builds the Components V2 Photo Rating Container
   */
  createPhotoContainer(author, imageUrl, caption = '', stats = { totalPoints: 0, voteCount: 0, averageRating: '0.0' }, disabled = false, statusNotice = null, sourceUrl = null) {
    const avg = stats.voteCount > 0 ? stats.averageRating : '—';
    const starDisplay = stats.voteCount > 0 ? '⭐'.repeat(Math.min(5, Math.max(1, Math.round(parseFloat(stats.averageRating) / 2)))) : '☆☆☆☆☆';

    let textContent = '';
    if (statusNotice) {
      textContent += `${statusNotice}\n\n`;
    }

    textContent += `# ✈️ Spotter Shot by ${author.tag || author.username}\n\n`;
    if (caption && caption.trim().length > 0) {
      textContent += `📝 *"${caption.trim()}"*\n\n`;
    }
    textContent +=
      `🏆 **Score Points:** **${stats.totalPoints}** pts\n` +
      `📊 **Average Rating:** **${avg}/10** ${starDisplay}\n` +
      `🗳️ **Total Votes:** **${stats.voteCount}** votes\n\n` +
      `*Click a rating button below (1–10) to vote!*`;

    if (sourceUrl) {
      textContent += `\n\n🔗 [Original Submission](${sourceUrl})`;
    }

    // Action Rows for 1-5 and 6-10
    const row1 = componentsV2.createActionRow([
      componentsV2.createButton({ customId: 'rate_photo_1', label: '1', style: 2, emoji: '1️⃣', disabled }),
      componentsV2.createButton({ customId: 'rate_photo_2', label: '2', style: 2, emoji: '2️⃣', disabled }),
      componentsV2.createButton({ customId: 'rate_photo_3', label: '3', style: 2, emoji: '3️⃣', disabled }),
      componentsV2.createButton({ customId: 'rate_photo_4', label: '4', style: 2, emoji: '4️⃣', disabled }),
      componentsV2.createButton({ customId: 'rate_photo_5', label: '5', style: 2, emoji: '5️⃣', disabled })
    ]);

    const row2 = componentsV2.createActionRow([
      componentsV2.createButton({ customId: 'rate_photo_6', label: '6', style: 1, emoji: '6️⃣', disabled }),
      componentsV2.createButton({ customId: 'rate_photo_7', label: '7', style: 1, emoji: '7️⃣', disabled }),
      componentsV2.createButton({ customId: 'rate_photo_8', label: '8', style: 1, emoji: '8️⃣', disabled }),
      componentsV2.createButton({ customId: 'rate_photo_9', label: '9', style: 1, emoji: '9️⃣', disabled }),
      componentsV2.createButton({ customId: 'rate_photo_10', label: '10 (+2 Bonus)', style: 3, emoji: '🌟', disabled })
    ]);

    return componentsV2.createContainer({
      accentColor: config.colors.primary,
      components: [
        componentsV2.createMediaGallery([imageUrl]),
        componentsV2.createSection({
          text: textContent,
          accessory: author.displayAvatarURL ? componentsV2.createThumbnail(author.displayAvatarURL({ dynamic: true })) : null
        }),
        row1,
        row2
      ]
    });
  }
};

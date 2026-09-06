const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');
const componentsV2 = require('../../utils/componentsV2');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top-invites')
    .setDescription('Display the top inviters leaderboard on the server'),

  async execute(interaction) {
    const guild = interaction.guild;
    const topInviters = db.getTopInviters(guild.id, 10);

    if (!topInviters || topInviters.length === 0) {
      return interaction.reply({
        content: 'ℹ️ No members have recorded invites yet on this server.',
        flags: 64
      });
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    let leaderboardText = `# 🏆 Top Inviters Leaderboard\n\n`;

    for (let i = 0; i < topInviters.length; i++) {
      const row = topInviters[i];
      const medal = medals[i] || `${i + 1}.`;
      const netTotal = Math.max(0, (row.regular || 0) + (row.bonus || 0) - (row.left || 0) - (row.fake || 0));

      leaderboardText += `${medal} <@${row.user_id}> — **${netTotal} invites** *(✅ ${row.regular || 0} | ⛔ ${row.left || 0} | 🎁 ${row.bonus || 0})*\n`;
    }

    leaderboardText += `\n*Track your invites anytime using \`/invites\`!*`;

    const container = componentsV2.createContainer({
      accentColor: config.colors.primary,
      components: [
        componentsV2.createSection({
          text: leaderboardText,
          accessory: guild.iconURL ? componentsV2.createThumbnail(guild.iconURL({ dynamic: true })) : null
        })
      ]
    });

    return interaction.reply({
      flags: 32768,
      components: [container]
    });
  }
};

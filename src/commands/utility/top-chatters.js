const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const levelHelper = require('../../utils/levelHelper');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top-chatters')
    .setDescription('Displays the server activity leaderboard (Top 10 most active chatters)')
    .setDMPermission(false),

  async execute(interaction) {
    const guild = interaction.guild;
    const topUsers = db.getTopUsersByChatXP(guild.id, 10);

    if (!topUsers || topUsers.length === 0) {
      return interaction.reply({
        content: 'ℹ️ No activity data recorded yet. Start chatting in text channels to earn XP!',
        ephemeral: true
      });
    }

    const leaderboardLines = [];
    const medals = ['🥇', '🥈', '🥉'];

    for (let i = 0; i < topUsers.length; i++) {
      const u = topUsers[i];
      const medal = i < 3 ? medals[i] : `**#${i + 1}**`;
      const levelData = levelHelper.calculateChatLevelData(u.chat_xp || 0);

      leaderboardLines.push(
        `${medal} <@${u.user_id}> • **Level ${levelData.level}** (*${levelData.rankTitle}*)\n` +
        `   └ ✨ **${u.chat_xp || 0}** Chat XP • 💬 **${u.messages_count || 0}** messages`
      );
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`💬 Top Active Chatters — ${guild.name}`)
      .setDescription(
        `Here are the most active community members based on chat activity level:\n\n` +
        leaderboardLines.join('\n\n')
      )
      .setFooter({ text: `${config.footerText} • Anti-spam cooldown active (15-25 XP/min)` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};

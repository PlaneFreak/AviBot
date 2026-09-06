const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');
const levelHelper = require('../../utils/levelHelper');
const componentsV2 = require('../../utils/componentsV2');
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
        flags: 64
      });
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    let listText = `# 💬 Top Active Chatters — ${guild.name}\n\n`;

    for (let i = 0; i < topUsers.length; i++) {
      const u = topUsers[i];
      const medal = medals[i] || `${i + 1}.`;
      const levelData = levelHelper.calculateChatLevelData(u.chat_xp || 0);

      listText += `${medal} <@${u.user_id}> — **Level ${levelData.level}** (*${levelData.rankTitle}*)\n   └ ✨ **${(u.chat_xp || 0).toLocaleString()}** Chat XP • 💬 **${(u.messages_count || 0).toLocaleString()}** messages\n\n`;
    }

    listText += `*Chat activity awards 15–25 XP per minute in text channels.*`;

    const container = componentsV2.createContainer({
      accentColor: config.colors.primary,
      components: [
        componentsV2.createSection({
          text: listText,
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

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const levelHelper = require('../../utils/levelHelper');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top-spotters')
    .setDescription('Displays the top 10 community spotters ranked by Level and XP')
    .setDMPermission(false),

  async execute(interaction) {
    const guild = interaction.guild;
    const topUsers = db.getTopUsersByXP(guild.id, 10);

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🌟 Top Community Spotters & Aviators')
      .setDescription(`The highest-ranking members of **${guild.name}** based on XP and photo championships.\n`)
      .setFooter({ text: `${config.footerText} • Type /rank to check your profile` })
      .setTimestamp();

    if (!topUsers || topUsers.length === 0) {
      embed.setDescription('*No members have earned XP yet. Upload photos in `#pic-rating` to win leaderboards!*');
      return interaction.reply({ embeds: [embed] });
    }

    const medals = ['🥇', '🥈', '🥉'];
    let listText = '';

    for (let i = 0; i < topUsers.length; i++) {
      const u = topUsers[i];
      const medal = i < 3 ? medals[i] : `\`#${i + 1}\``;
      const rankTitle = levelHelper.getRankTitle(u.level);
      listText += `${medal} <@${u.user_id}> — **Level ${u.level}** (${rankTitle})\n┗ ✨ **${u.xp} XP**\n\n`;
    }

    embed.addFields({
      name: '🏆 Server Hall of Fame',
      value: listText
    });

    await interaction.reply({ embeds: [embed] });
  }
};

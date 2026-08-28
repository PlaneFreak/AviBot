const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('full-kick')
    .setDescription('Directly kicks a user immediately from the server without appeals or quarantine')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member to kick immediately')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the immediate kick')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        content: `${config.emojis.error} User is not in this server.`,
        ephemeral: true
      });
    }

    if (!member.kickable) {
      return interaction.reply({
        content: `${config.emojis.error} Cannot kick this user (they may have higher permissions than AviBot).`,
        ephemeral: true
      });
    }

    if (member.id === interaction.user.id) {
      return interaction.reply({
        content: `${config.emojis.error} You cannot kick yourself.`,
        ephemeral: true
      });
    }

    try {
      // 1. Send DM notification if possible
      await targetUser.send({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle(`🚪 Kicked from ${interaction.guild.name}`)
            .setDescription(`You have been directly kicked from **${interaction.guild.name}**.\n\n**Reason:** ${reason}`)
            .setFooter({ text: config.footerText })
            .setTimestamp()
        ]
      }).catch(() => {});

      // 2. Direct Discord Kick
      await member.kick(`Immediate /full-kick by ${interaction.user.tag}: ${reason}`);

      const kickEmbed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('🚪 Member Direct Kicked')
        .setDescription(`Successfully kicked **${targetUser.tag}** (\`${targetUser.id}\`) from the server without appeals.`)
        .addFields(
          { name: '👤 User', value: `${targetUser.tag} (${targetUser})`, inline: true },
          { name: '🔨 Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: '📝 Reason', value: reason, inline: false }
        )
        .setFooter({ text: config.footerText })
        .setTimestamp();

      return interaction.reply({ embeds: [kickEmbed] });
    } catch (err) {
      console.error('Error in /full-kick command:', err);
      return interaction.reply({
        content: `${config.emojis.error} Failed to kick member: ${err.message}`,
        ephemeral: true
      });
    }
  }
};

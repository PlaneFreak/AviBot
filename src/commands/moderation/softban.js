const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Bans and immediately unbans a member to purge their messages and kick them')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to softban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the softban')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('delete_days')
        .setDescription('Days of message history to delete (1 to 7, default: 7)')
        .setMinValue(1)
        .setMaxValue(7)
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') || 7;

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    // Permission and Hierarchy checks
    if (member) {
      if (member.id === interaction.guild.ownerId) {
        return interaction.reply({
          content: `${config.emojis.error} Discord does not allow softbanning the **Server Owner**.`,
          ephemeral: true
        });
      }

      if (!member.bannable) {
        return interaction.reply({
          content: `${config.emojis.error} I cannot softban **${targetUser.tag}**. Their highest role is higher than or equal to my highest role.`,
          ephemeral: true
        });
      }

      if (interaction.member.roles.highest.position <= member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: `${config.emojis.error} You cannot softban **${targetUser.tag}** because their highest role is higher than or equal to yours.`,
          ephemeral: true
        });
      }

      // Try sending a DM notification to the user before softbanning
      const dmEmbed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle(`🔨 You have been softbanned from ${interaction.guild.name}`)
        .setDescription('You have been kicked and your recent messages were cleared. You may rejoin using an invite.')
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Moderator', value: interaction.user.tag }
        )
        .setTimestamp();

      await member.send({ embeds: [dmEmbed] }).catch(() => {});
    }

    await interaction.deferReply();

    try {
      // 1. Ban member and purge messages
      await interaction.guild.members.ban(targetUser.id, {
        deleteMessageSeconds: deleteDays * 86400,
        reason: `Softban by ${interaction.user.tag}: ${reason}`
      });

      // 2. Immediately unban to complete softban
      await interaction.guild.members.unban(targetUser.id, `Softban unban by ${interaction.user.tag}`);

      const softbanEmbed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle(`${config.emojis.shield} Member Softbanned`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'User', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: 'Purged Message History', value: `${deleteDays} day(s)`, inline: true },
          { name: 'Reason', value: reason }
        )
        .setFooter({ text: `${config.footerText} • Kicked & Messages Cleared` })
        .setTimestamp();

      await interaction.editReply({ embeds: [softbanEmbed] });
    } catch (error) {
      console.error('Error during softban:', error);
      return interaction.editReply({
        content: `${config.emojis.error} Failed to execute softban: \`${error.message}\``
      });
    }
  }
};

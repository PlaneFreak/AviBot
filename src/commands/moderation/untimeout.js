const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Removes timeout from a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to remove timeout from')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for removing the timeout')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        content: `${config.emojis.error} Could not find this member in the server.`,
        ephemeral: true
      });
    }

    if (!member.isCommunicationDisabled()) {
      return interaction.reply({
        content: `${config.emojis.warning} **${targetUser.tag}** is not currently timed out.`,
        ephemeral: true
      });
    }

    if (!member.moderatable) {
      return interaction.reply({
        content: `${config.emojis.error} I cannot modify timeout for **${targetUser.tag}**.`,
        ephemeral: true
      });
    }

    await member.timeout(null, `${interaction.user.tag}: ${reason}`);

    const untimeoutEmbed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle(`${config.emojis.shield} Timeout Removed`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'User', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setFooter({ text: config.footerText })
      .setTimestamp();

    await interaction.reply({ embeds: [untimeoutEmbed] });
  }
};

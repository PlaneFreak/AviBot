const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unbans a user from the server using their User ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName('user_id')
        .setDescription('The Discord User ID of the person to unban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for unbanning')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    const userId = interaction.options.getString('user_id').trim();
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Validate Discord snowflake ID format (17 to 20 digits)
    if (!/^\d{17,20}$/.test(userId)) {
      return interaction.reply({
        content: `${config.emojis.error} Invalid User ID format. Please provide a valid 17-20 digit Discord ID (e.g. \`123456789012345678\`).`,
        ephemeral: true
      });
    }

    await interaction.deferReply();

    try {
      // Check if the user is actually banned
      const banEntry = await interaction.guild.bans.fetch(userId).catch(() => null);

      if (!banEntry) {
        return interaction.editReply({
          content: `${config.emojis.warning} User with ID \`${userId}\` is not banned from this server.`
        });
      }

      // Execute unban
      await interaction.guild.members.unban(userId, `${interaction.user.tag}: ${reason}`);

      const user = banEntry.user;

      const unbanEmbed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle(`${config.emojis.shield} User Unbanned`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'User', value: `${user.tag} (\`${user.id}\`)`, inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Previous Ban Reason', value: banEntry.reason || 'None specified' }
        )
        .setFooter({ text: config.footerText })
        .setTimestamp();

      await interaction.editReply({ embeds: [unbanEmbed] });
    } catch (error) {
      console.error('Error during unban:', error);
      return interaction.editReply({
        content: `${config.emojis.error} Failed to unban user: \`${error.message}\``
      });
    }
  }
};

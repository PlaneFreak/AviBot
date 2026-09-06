const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
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

      const unbanContainer = componentsV2.createContainer({
        accentColor: config.colors.success,
        components: [
          componentsV2.createSection({
            text: `# ${config.emojis.shield} User Unbanned\n\n` +
                  `**User**\n${user.tag} (\`${user.id}\`)\n\n` +
                  `**Moderator**\n${interaction.user.tag}\n\n` +
                  `**Reason**\n${reason}\n\n` +
                  `**Previous Ban Reason**\n${banEntry.reason || 'None specified'}\n\n` +
                  `*${config.footerText}*`,
            accessory: componentsV2.createThumbnail(user.displayAvatarURL({ dynamic: true }))
          })
        ]
      });

      await componentsV2.editInteractionReply(interaction, [unbanContainer]);
    } catch (error) {
      console.error('Error during unban:', error);
      return interaction.editReply({
        content: `${config.emojis.error} Failed to unban user: \`${error.message}\``
      });
    }
  }
};

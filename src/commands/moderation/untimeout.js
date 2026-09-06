const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
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

    try {
      await member.timeout(null, `${interaction.user.tag}: ${reason}`);
    } catch (err) {
      return interaction.reply({
        content: `❌ Failed to remove timeout: ${err.message}`,
        ephemeral: true
      });
    }

    const untimeoutContainer = componentsV2.createContainer({
      accentColor: config.colors.success,
      components: [
        componentsV2.createSection({
          text: `# ${config.emojis.shield} Timeout Removed\n\n` +
                `**User**\n${targetUser.tag} (\`${targetUser.id}\`)\n\n` +
                `**Moderator**\n${interaction.user.tag}\n\n` +
                `**Reason**\n${reason}\n\n` +
                `*${config.footerText}*`,
          accessory: componentsV2.createThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        })
      ]
    });

    await componentsV2.replyToInteraction(interaction, [untimeoutContainer]);
  }
};

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
const config = require('../../config');
const suspensionManager = require('../../utils/suspensionManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Suspends a member with a 5-day appeal period before permanent ban')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The user/member to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('immediate')
        .setDescription('Bypass 5-day appeal window and ban immediately')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('delete_days')
        .setDescription('Number of days of messages to delete (0 to 7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const immediate = interaction.options.getBoolean('immediate') || false;
    const deleteDays = interaction.options.getInteger('delete_days') || 0;

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (member) {
      if (member.id === interaction.guild.ownerId) {
        return interaction.reply({
          content: `${config.emojis.error} Discord does not allow banning the **Server Owner**.`,
          ephemeral: true
        });
      }

      if (!member.bannable) {
        return interaction.reply({
          content: `${config.emojis.error} I cannot ban **${targetUser.tag}**. Their highest role is higher than or equal to my highest role.`,
          ephemeral: true
        });
      }

      if (interaction.member.roles.highest.position <= member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: `${config.emojis.error} You cannot ban **${targetUser.tag}** because their highest role is higher than or equal to yours.`,
          ephemeral: true
        });
      }

      // If NOT immediate, quarantine with 5-day appeal period
      if (!immediate) {
        await interaction.deferReply();

        const { expiresAtSeconds, jailChannel, caseNumber } = await suspensionManager.quarantineMember(
          member,
          'ban',
          reason,
          interaction.user
        );

        const container = componentsV2.createContainer({
          accentColor: config.colors.error,
          components: [
            componentsV2.createSection({
              text: `# ${config.emojis.shield} Member Quarantined (Ban Pending • Case #${caseNumber})\n\n**${targetUser.tag}** has been moved to their private jail channel ${jailChannel} and assigned \`⛔ㆍSuspended\`.\nThey have **5 days** (<t:${expiresAtSeconds}:R>) to submit an appeal before the ban is finalized.\n\n**User**\n${targetUser.tag} (\`${targetUser.id}\`)\n\n**Moderator**\n${interaction.user.tag}\n\n**Jail Channel**\n${jailChannel}\n\n**Reason**\n${reason}\n\n*${config.footerText} • Case #${caseNumber}*`,
              accessory: componentsV2.createThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            })
          ]
        });

        return componentsV2.editInteractionReply(interaction, [container]);
      }
    }

    // Immediate Ban Execution
    try {
      await interaction.guild.members.ban(targetUser.id, {
        deleteMessageSeconds: deleteDays * 86400,
        reason: `${interaction.user.tag}: ${reason}`
      });
    } catch (err) {
      return interaction.reply({
        content: `❌ Failed to ban user: ${err.message}`,
        ephemeral: true
      });
    }

    const banContainer = componentsV2.createContainer({
      accentColor: config.colors.error,
      components: [
        componentsV2.createSection({
          text: `# ${config.emojis.shield} Member Banned (Immediate)\n\n**User**\n${targetUser.tag} (\`${targetUser.id}\`)\n\n**Moderator**\n${interaction.user.tag}\n\n**Reason**\n${reason}\n\n**Deleted Messages**\n${deleteDays} day(s)\n\n*${config.footerText}*`,
          accessory: componentsV2.createThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        })
      ]
    });

    await componentsV2.replyToInteraction(interaction, [banContainer]);
  }
};

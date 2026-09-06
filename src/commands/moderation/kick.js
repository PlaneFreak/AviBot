const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
const config = require('../../config');
const suspensionManager = require('../../utils/suspensionManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Suspends a member with a 5-day appeal period before server kick')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('immediate')
        .setDescription('Bypass 5-day appeal window and kick immediately')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const immediate = interaction.options.getBoolean('immediate') || false;

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        content: `${config.emojis.error} Could not find this member in the server.`,
        ephemeral: true
      });
    }

    if (member.id === interaction.guild.ownerId) {
      return interaction.reply({
        content: `${config.emojis.error} Discord does not allow kicking the **Server Owner**.`,
        ephemeral: true
      });
    }

    if (!member.kickable) {
      return interaction.reply({
        content: `${config.emojis.error} I cannot kick **${targetUser.tag}**. Their highest role is higher than or equal to my highest role.`,
        ephemeral: true
      });
    }

    if (interaction.member.roles.highest.position <= member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
      return interaction.reply({
        content: `${config.emojis.error} You cannot kick **${targetUser.tag}** because their highest role is higher than or equal to yours.`,
        ephemeral: true
      });
    }

    // If NOT immediate, quarantine with 5-day appeal period
    if (!immediate) {
      await interaction.deferReply();

      const { expiresAtSeconds, jailChannel, caseNumber } = await suspensionManager.quarantineMember(
        member,
        'kick',
        reason,
        interaction.user
      );

      const container = componentsV2.createContainer({
        accentColor: config.colors.warning,
        components: [
          componentsV2.createSection({
            text: `# ${config.emojis.shield} Member Quarantined (Kick Pending • Case #${caseNumber})\n\n**${targetUser.tag}** has been moved to their private jail channel ${jailChannel} and assigned \`⛔ㆍSuspended\`.\nThey have **5 days** (<t:${expiresAtSeconds}:R>) to submit an appeal before the kick is finalized.\n\n**User**\n${targetUser.tag} (\`${targetUser.id}\`)\n\n**Moderator**\n${interaction.user.tag}\n\n**Jail Channel**\n${jailChannel}\n\n**Reason**\n${reason}\n\n*${config.footerText} • Case #${caseNumber}*`,
            accessory: componentsV2.createThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
          })
        ]
      });

      return componentsV2.editInteractionReply(interaction, [container]);
    }

    // Immediate kick
    await member.kick(`${interaction.user.tag}: ${reason}`);

    const containerImmediate = componentsV2.createContainer({
      accentColor: config.colors.warning,
      components: [
        componentsV2.createSection({
          text: `# ${config.emojis.shield} Member Kicked (Immediate)\n\n**User**\n${targetUser.tag} (\`${targetUser.id}\`)\n\n**Moderator**\n${interaction.user.tag}\n\n**Reason**\n${reason}\n\n*${config.footerText}*`,
          accessory: componentsV2.createThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        })
      ]
    });

    await componentsV2.replyToInteraction(interaction, [containerImmediate]);
  }
};

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
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

      const suspendEmbed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle(`${config.emojis.shield} Member Quarantined (Kick Pending • Case #${caseNumber})`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `**${targetUser.tag}** has been moved to their private jail channel ${jailChannel} and assigned \`⛔ㆍSuspended\`.\n` +
          `They have **5 days** (<t:${expiresAtSeconds}:R>) to submit an appeal before the kick is finalized.`
        )
        .addFields(
          { name: 'User', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: 'Jail Channel', value: `${jailChannel}`, inline: true },
          { name: 'Reason', value: reason }
        )
        .setFooter({ text: `${config.footerText} • Case #${caseNumber}` })
        .setTimestamp();

      return interaction.editReply({ embeds: [suspendEmbed] });
    }

    // Immediate kick
    await member.kick(`${interaction.user.tag}: ${reason}`);

    const kickEmbed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle(`${config.emojis.shield} Member Kicked (Immediate)`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'User', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setFooter({ text: config.footerText })
      .setTimestamp();

    await interaction.reply({ embeds: [kickEmbed] });
  }
};

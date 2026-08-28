const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
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

        const suspendEmbed = new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle(`${config.emojis.shield} Member Quarantined (Ban Pending • Case #${caseNumber})`)
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
          .setDescription(
            `**${targetUser.tag}** has been moved to their private jail channel ${jailChannel} and assigned \`⛔ㆍSuspended\`.\n` +
            `They have **5 days** (<t:${expiresAtSeconds}:R>) to submit an appeal before the ban is finalized.`
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
    }

    // Immediate Ban Execution
    await interaction.guild.members.ban(targetUser.id, {
      deleteMessageSeconds: deleteDays * 86400,
      reason: `${interaction.user.tag}: ${reason}`
    });

    const banEmbed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle(`${config.emojis.shield} Member Banned (Immediate)`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'User', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason },
        { name: 'Deleted Messages', value: `${deleteDays} day(s)`, inline: true }
      )
      .setFooter({ text: config.footerText })
      .setTimestamp();

    await interaction.reply({ embeds: [banEmbed] });
  }
};

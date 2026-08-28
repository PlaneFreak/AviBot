const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issues a formal warning to a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to warn')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(true)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason');

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        content: `${config.emojis.error} Could not find this member in the server.`,
        ephemeral: true
      });
    }

    if (member.user.bot) {
      return interaction.reply({
        content: `${config.emojis.error} You cannot warn bots.`,
        ephemeral: true
      });
    }

    // Attempt to DM the member
    let dmSent = true;
    const dmEmbed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle(`⚠️ Formal Warning in ${interaction.guild.name}`)
      .addFields(
        { name: 'Reason', value: reason },
        { name: 'Moderator', value: interaction.user.tag }
      )
      .setFooter({ text: 'Please follow server rules to avoid further moderation actions.' })
      .setTimestamp();

    try {
      await member.send({ embeds: [dmEmbed] });
    } catch {
      dmSent = false;
    }

    const warnEmbed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle(`${config.emojis.warning} Member Warned`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'User', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason },
        { name: 'DM Notification', value: dmSent ? '✅ Delivered' : '❌ Could not DM user (DMs disabled)', inline: true }
      )
      .setFooter({ text: config.footerText })
      .setTimestamp();

    await interaction.reply({ embeds: [warnEmbed] });
  }
};

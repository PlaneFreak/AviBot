const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const appealHelper = require('../../utils/appealHelper');

// Helper function to parse duration string like "10m", "2h", "1d"
function parseDuration(str) {
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeouts / mutes a member for a specified duration')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to timeout')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('duration')
        .setDescription('Duration (e.g., 60s, 10m, 2h, 7d). Max: 28 days.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const durationInput = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const durationMs = parseDuration(durationInput);
    const maxMs = 28 * 24 * 60 * 60 * 1000; // Discord limit: 28 days

    if (!durationMs || durationMs <= 0 || durationMs > maxMs) {
      return interaction.reply({
        content: `${config.emojis.error} Invalid duration format. Please use formats like \`60s\`, \`10m\`, \`2h\`, or \`7d\` (maximum 28 days).`,
        ephemeral: true
      });
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        content: `${config.emojis.error} Could not find this member in the server.`,
        ephemeral: true
      });
    }

    if (member.id === interaction.guild.ownerId) {
      return interaction.reply({
        content: `${config.emojis.error} Discord does not allow timing out the **Server Owner**.`,
        ephemeral: true
      });
    }

    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: `${config.emojis.error} Discord does not allow timing out members with the **Administrator** permission (regardless of bot role position).`,
        ephemeral: true
      });
    }

    if (!member.moderatable) {
      return interaction.reply({
        content: `${config.emojis.error} I cannot timeout **${targetUser.tag}**. Their highest role is higher than or equal to my highest role.`,
        ephemeral: true
      });
    }

    if (interaction.member.roles.highest.position <= member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
      return interaction.reply({
        content: `${config.emojis.error} You cannot timeout **${targetUser.tag}** because their highest role is higher than or equal to yours.`,
        ephemeral: true
      });
    }

    // Try sending DM with Appeal Button and DM Reply option
    const dmEmbed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle(`⏳ You have been timed out in ${interaction.guild.name}`)
      .setDescription(
        'If you believe this punishment was unfair or made in error, you can submit an appeal.\n\n' +
        '**How to Appeal:**\n' +
        '• Click the **Submit Appeal** button below\n' +
        '• **OR** simply **reply directly to this DM** with your explanation/apology!'
      )
      .addFields(
        { name: 'Duration', value: durationInput },
        { name: 'Reason', value: reason },
        { name: 'Moderator', value: interaction.user.tag }
      )
      .setTimestamp();

    const appealRow = appealHelper.createAppealButton(interaction.guild.id, 'timeout');
    await member.send({ embeds: [dmEmbed], components: [appealRow] }).catch(() => {});

    // Record punishment for seamless DM appeal routing
    const punishmentTracker = require('../../data/punishmentTracker');
    punishmentTracker.recordPunishment(targetUser.id, {
      guildId: interaction.guild.id,
      guildName: interaction.guild.name,
      type: 'timeout',
      reason: reason,
      moderatorTag: interaction.user.tag
    });

    // Apply timeout
    await member.timeout(durationMs, `${interaction.user.tag}: ${reason}`);

    const timeoutEmbed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle(`${config.emojis.shield} Member Timed Out`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'User', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
        { name: 'Duration', value: durationInput, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setFooter({ text: config.footerText })
      .setTimestamp();

    await interaction.reply({ embeds: [timeoutEmbed] });
  }
};

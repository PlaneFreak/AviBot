const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chatstop')
    .setDescription('Closes chat communication in a jail quarantine channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    const channel = interaction.channel;

    if (!channel.name.startsWith('jail-')) {
      return interaction.reply({
        content: `${config.emojis.error} The \`/chatstop\` command can only be used inside a \`jail-XXXXX\` channel.`,
        ephemeral: true
      });
    }

    // Find member overwrite in channel
    const memberOverwrite = channel.permissionOverwrites.cache.find(
      ow => ow.type === 1 // Member overwrite
    );

    if (memberOverwrite) {
      await channel.permissionOverwrites.edit(memberOverwrite.id, {
        SendMessages: false,
        AddReactions: false
      }, { reason: `Chat closed by ${interaction.user.tag}` });
    }

    const stopEmbed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle('🔒 Chat Closed')
      .setDescription(
        `Chat access has been disabled by ${interaction.user}.\n` +
        `The quarantined user can no longer send messages in this channel.\n\n` +
        `*Click **Chat Activate** above to reopen communication if needed.*`
      )
      .setFooter({ text: config.footerText })
      .setTimestamp();

    await interaction.reply({ embeds: [stopEmbed] });
  }
};

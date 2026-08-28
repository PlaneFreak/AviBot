const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Deletes a specified number of messages from the channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Number of messages to delete (1 to 100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('Only delete messages sent by this specific user')
        .setRequired(false)
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const targetUser = interaction.options.getUser('target');

    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.channel;
    const messages = await channel.messages.fetch({ limit: amount });

    let messagesToDelete = messages;
    if (targetUser) {
      messagesToDelete = messages.filter(m => m.author.id === targetUser.id);
    }

    // Filter out messages older than 14 days (Discord limitation)
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const recentMessages = messagesToDelete.filter(m => m.createdTimestamp > fourteenDaysAgo);

    if (recentMessages.size === 0) {
      return interaction.editReply({
        content: `${config.emojis.warning} No deletable messages found (messages older than 14 days cannot be bulk deleted).`
      });
    }

    const deleted = await channel.bulkDelete(recentMessages, true);

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle(`${config.emojis.success} Messages Deleted`)
      .setDescription(
        targetUser
          ? `Successfully purged **${deleted.size}** message(s) from **${targetUser.tag}** in ${channel}.`
          : `Successfully purged **${deleted.size}** message(s) in ${channel}.`
      )
      .setFooter({ text: config.footerText })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};

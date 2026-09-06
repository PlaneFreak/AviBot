const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
const stickyManager = require('../../data/stickyManager');
const config = require('../../config');

function formatStickyMessage(content) {
  return `# 📌 Pinned Message\n${content}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stick')
    .setDescription('Sets a sticky message that stays pinned at the bottom of the channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('The message content to stick at the bottom of this channel')
        .setRequired(true)
    ),

  async execute(interaction) {
    const channel = interaction.channel;
    const content = interaction.options.getString('message');

    await interaction.deferReply({ ephemeral: true });

    // Delete existing sticky if there is one
    const existingSticky = stickyManager.getSticky(channel.id);
    if (existingSticky && existingSticky.lastMessageId) {
      const oldMsg = await channel.messages.fetch(existingSticky.lastMessageId).catch(() => null);
      if (oldMsg) await oldMsg.delete().catch(() => {});
    }

    // Send sticky message as plain text header
    const stickyText = formatStickyMessage(content);
    const sentSticky = await channel.send({ content: stickyText });

    // Store in sticky manager
    stickyManager.setSticky(channel.id, {
      content: content,
      lastMessageId: sentSticky.id,
      authorId: interaction.user.id
    });

    const mdText = `# 📌 Sticky Message Configured\n\nSuccessfully set sticky message in ${channel}!\nWhenever members post, this message will stay stuck at the bottom.\n\n*${config.footerText}*`;
    const container = componentsV2.createContainer({
      accentColor: config.colors.success,
      components: [
        componentsV2.createSection({ text: mdText })
      ]
    });

    await componentsV2.editInteractionReply(interaction, [container]);
  }
};

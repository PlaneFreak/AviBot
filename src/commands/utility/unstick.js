const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
const stickyManager = require('../../data/stickyManager');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unstick')
    .setDescription('Removes the sticky message from this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),

  async execute(interaction) {
    const channel = interaction.channel;
    const existingSticky = stickyManager.getSticky(channel.id);

    if (!existingSticky) {
      return interaction.reply({
        content: `${config.emojis.warning} There is no active sticky message in this channel.`,
        ephemeral: true
      });
    }

    if (existingSticky.lastMessageId) {
      const oldMsg = await channel.messages.fetch(existingSticky.lastMessageId).catch(() => null);
      if (oldMsg) await oldMsg.delete().catch(() => {});
    }

    stickyManager.deleteSticky(channel.id);

    const mdText = `# 🗑️ Sticky Message Removed\n\nThe sticky message for ${channel} has been successfully cleared.\n\n*${config.footerText}*`;
    const container = componentsV2.createContainer({
      accentColor: config.colors.success,
      components: [
        componentsV2.createSection({ text: mdText })
      ]
    });

    await componentsV2.replyToInteraction(interaction, [container], { ephemeral: true });
  }
};

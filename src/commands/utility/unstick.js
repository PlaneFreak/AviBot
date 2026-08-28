const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
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

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('🗑️ Sticky Message Removed')
      .setDescription(`The sticky message for ${channel} has been successfully cleared.`)
      .setFooter({ text: config.footerText });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

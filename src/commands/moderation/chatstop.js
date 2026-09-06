const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
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
      try {
        await channel.permissionOverwrites.edit(memberOverwrite.id, {
          SendMessages: false,
          AddReactions: false
        }, { reason: `Chat closed by ${interaction.user.tag}` });
      } catch (err) {
        return interaction.reply({
          content: `❌ Failed to update channel permissions: ${err.message}`,
          ephemeral: true
        });
      }
    }

    const container = componentsV2.createContainer({
      accentColor: config.colors.error,
      components: [
        componentsV2.createSection({
          text: `# 🔒 Chat Closed\n\nChat access has been disabled by ${interaction.user}.\nThe quarantined user can no longer send messages in this channel.\n\n*Click **Chat Activate** above to reopen communication if needed.*\n\n*${config.footerText}*`
        })
      ]
    });

    await componentsV2.replyToInteraction(interaction, [container]);
  }
};

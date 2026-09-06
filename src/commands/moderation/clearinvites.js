const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const componentsV2 = require('../../utils/componentsV2');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearinvites')
    .setDescription('Reset all tracked invites for a server member')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('The member whose invites should be reset')
        .setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const guild = interaction.guild;

    db.clearMemberInvites(target.id, guild.id);

    const container = componentsV2.createContainer({
      accentColor: config.colors.primary,
      components: [
        componentsV2.createSection({
          text:
            `# 🧹 Invites Reset\n\n` +
            `All invite statistics for ${target} (\`${target.tag}\`) have been successfully reset to \`0\`.\n\n` +
            `*Cleared by ${interaction.user}*`,
          accessory: target.displayAvatarURL ? componentsV2.createThumbnail(target.displayAvatarURL({ dynamic: true })) : null
        })
      ]
    });

    await componentsV2.sendToChannel(interaction.client, interaction.channel.id, [container]);

    return interaction.reply({
      content: `✅ Successfully reset invites for **${target.tag}**!`,
      flags: 64
    });
  }
};

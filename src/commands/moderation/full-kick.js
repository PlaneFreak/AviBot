const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('full-kick')
    .setDescription('Directly kicks a user immediately from the server without appeals or quarantine')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member to kick immediately')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the immediate kick')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        content: `${config.emojis.error} User is not in this server.`,
        ephemeral: true
      });
    }

    if (!member.kickable) {
      return interaction.reply({
        content: `${config.emojis.error} Cannot kick this user (they may have higher permissions than AviBot).`,
        ephemeral: true
      });
    }

    if (member.id === interaction.user.id) {
      return interaction.reply({
        content: `${config.emojis.error} You cannot kick yourself.`,
        ephemeral: true
      });
    }

    try {
      // 1. Send DM notification if possible
      const dmContainer = componentsV2.createContainer({
        accentColor: config.colors.error,
        components: [
          componentsV2.createSection({
            text: `# 🚪 Kicked from ${interaction.guild.name}\n\nYou have been directly kicked from **${interaction.guild.name}**.\n\n**Reason:** ${reason}\n\n*${config.footerText}*`
          })
        ]
      });
      await componentsV2.sendDM(interaction.client, targetUser.id, [dmContainer]).catch(() => {});

      // 2. Direct Discord Kick
      await member.kick(`Immediate /full-kick by ${interaction.user.tag}: ${reason}`);

      const container = componentsV2.createContainer({
        accentColor: config.colors.success,
        components: [
          componentsV2.createSection({
            text: `# 🚪 Member Direct Kicked\n\nSuccessfully kicked **${targetUser.tag}** (\`${targetUser.id}\`) from the server without appeals.\n\n**👤 User**\n${targetUser.tag} (${targetUser})\n\n**🔨 Moderator**\n${interaction.user.tag}\n\n**📝 Reason**\n${reason}\n\n*${config.footerText}*`
          })
        ]
      });

      return componentsV2.replyToInteraction(interaction, [container]);
    } catch (err) {
      console.error('Error in /full-kick command:', err);
      return interaction.reply({
        content: `${config.emojis.error} Failed to kick member: ${err.message}`,
        ephemeral: true
      });
    }
  }
};

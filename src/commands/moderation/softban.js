const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Bans and immediately unbans a member to purge their messages and kick them')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to softban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the softban')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('delete_days')
        .setDescription('Days of message history to delete (1 to 7, default: 7)')
        .setMinValue(1)
        .setMaxValue(7)
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') || 7;

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    // Permission and Hierarchy checks
    if (member) {
      if (member.id === interaction.guild.ownerId) {
        return interaction.reply({
          content: `${config.emojis.error} Discord does not allow softbanning the **Server Owner**.`,
          ephemeral: true
        });
      }

      if (!member.bannable) {
        return interaction.reply({
          content: `${config.emojis.error} I cannot softban **${targetUser.tag}**. Their highest role is higher than or equal to my highest role.`,
          ephemeral: true
        });
      }

      if (interaction.member.roles.highest.position <= member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: `${config.emojis.error} You cannot softban **${targetUser.tag}** because their highest role is higher than or equal to yours.`,
          ephemeral: true
        });
      }

      // Try sending a DM notification to the user before softbanning
      const dmContainer = componentsV2.createContainer({
        accentColor: config.colors.warning,
        components: [
          componentsV2.createSection({
            text: `# 🔨 You have been softbanned from ${interaction.guild.name}\n\nYou have been kicked and your recent messages were cleared. You may rejoin using an invite.\n\n**Reason**\n${reason}\n\n**Moderator**\n${interaction.user.tag}`
          })
        ]
      });

      await componentsV2.sendDM(interaction.client, member.id, [dmContainer]).catch(() => {});
    }

    await interaction.deferReply();

    try {
      // 1. Ban member and purge messages
      await interaction.guild.members.ban(targetUser.id, {
        deleteMessageSeconds: deleteDays * 86400,
        reason: `Softban by ${interaction.user.tag}: ${reason}`
      });

      // 2. Immediately unban to complete softban
      await interaction.guild.members.unban(targetUser.id, `Softban unban by ${interaction.user.tag}`);

      const softbanContainer = componentsV2.createContainer({
        accentColor: config.colors.warning,
        components: [
          componentsV2.createSection({
            text: `# ${config.emojis.shield} Member Softbanned\n\n**User**\n${targetUser.tag} (\`${targetUser.id}\`)\n\n**Moderator**\n${interaction.user.tag}\n\n**Purged Message History**\n${deleteDays} day(s)\n\n**Reason**\n${reason}\n\n*${config.footerText} • Kicked & Messages Cleared*`,
            accessory: componentsV2.createThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
          })
        ]
      });

      await componentsV2.editInteractionReply(interaction, [softbanContainer]);
    } catch (error) {
      console.error('Error during softban:', error);
      return interaction.editReply({
        content: `${config.emojis.error} Failed to execute softban: \`${error.message}\``
      });
    }
  }
};

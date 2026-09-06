const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issues a formal warning to a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to warn')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(true)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason');

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        content: `${config.emojis.error} Could not find this member in the server.`,
        ephemeral: true
      });
    }

    if (member.user.bot) {
      return interaction.reply({
        content: `${config.emojis.error} You cannot warn bots.`,
        ephemeral: true
      });
    }

    // Attempt to DM the member
    let dmSent = true;
    const dmContainer = componentsV2.createContainer({
      accentColor: config.colors.warning,
      components: [
        componentsV2.createSection({
          text: `# ⚠️ Formal Warning in ${interaction.guild.name}\n\n` +
                `**Reason**\n${reason}\n\n` +
                `**Moderator**\n${interaction.user.tag}\n\n` +
                `*Please follow server rules to avoid further moderation actions.*`
        })
      ]
    });

    try {
      await componentsV2.sendDM(interaction.client, member.id, [dmContainer]);
    } catch {
      dmSent = false;
    }

    const warnContainer = componentsV2.createContainer({
      accentColor: config.colors.warning,
      components: [
        componentsV2.createSection({
          text: `# ${config.emojis.warning} Member Warned\n\n` +
                `**User**\n${targetUser.tag} (\`${targetUser.id}\`)\n\n` +
                `**Moderator**\n${interaction.user.tag}\n\n` +
                `**Reason**\n${reason}\n\n` +
                `**DM Notification**\n${dmSent ? '✅ Delivered' : '❌ Could not DM user (DMs disabled)'}\n\n` +
                `*${config.footerText}*`,
          accessory: componentsV2.createThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        })
      ]
    });

    await componentsV2.replyToInteraction(interaction, [warnContainer]);
  }
};

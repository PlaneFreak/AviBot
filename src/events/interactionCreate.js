const { Events, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const config = require('../config');
const appealHelper = require('../utils/appealHelper');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // -----------------------------------------------------------------
    // 1. Handle Slash Commands
    // -----------------------------------------------------------------
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return interaction.reply({
          content: `${config.emojis.error} This command is not recognized or has been removed.`,
          ephemeral: true
        });
      }

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(`Error executing /${interaction.commandName}:`, error);

        const errorEmbed = new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle(`${config.emojis.error} Command Execution Error`)
          .setDescription('There was an unexpected error while executing this command.')
          .addFields({
            name: 'Error Details',
            value: `\`\`\`${(error.message || 'Unknown error').slice(0, 1000)}\`\`\``
          })
          .setFooter({ text: config.footerText })
          .setTimestamp();

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        }
      }
      return;
    }

    // -----------------------------------------------------------------
    // 2. Handle Button Interactions (Appeals open / accept / reject)
    // -----------------------------------------------------------------
    if (interaction.isButton()) {
      const customId = interaction.customId;

      // 2.0 Photo Rating Button (1-10)
      if (customId.startsWith('rate_photo_')) {
        const rating = parseInt(customId.replace('rate_photo_', ''), 10);
        const db = require('../database/db');
        const photoRatingHelper = require('../utils/photoRatingHelper');

        const submission = db.getPhotoSubmissionByMessageId(interaction.message.id);
        if (!submission) {
          return interaction.reply({
            content: `${config.emojis.error} This photo submission is not tracked in the database.`,
            ephemeral: true
          });
        }

        // Anti-Self-Vote Protection
        if (submission.user_id === interaction.user.id) {
          return interaction.reply({
            content: `🚫 You cannot rate your own photo!`,
            ephemeral: true
          });
        }

        try {
          const voteResult = db.addOrUpdateVote(submission.id, interaction.user.id, rating);
          const author = await client.users.fetch(submission.user_id).catch(() => ({
            tag: 'Spotter',
            username: 'Spotter',
            displayAvatarURL: () => null
          }));

          const currentEmbed = interaction.message.embeds[0];
          const displayImage = currentEmbed?.image?.url || submission.image_url;

          const updatedEmbed = photoRatingHelper.createPhotoEmbed(
            author,
            displayImage,
            submission.caption,
            voteResult
          );

          await interaction.message.edit({ embeds: [updatedEmbed] });

          const pointsText = rating === 10
            ? '🌟 **10/10 (+10 pts including +2 bonus!)**'
            : `⭐ **${rating}/10 (+${voteResult.pointsAwarded} pts to score)**`;

          return interaction.reply({
            content: `✅ Your vote was recorded: ${pointsText}`,
            ephemeral: true
          });
        } catch (err) {
          console.error('Error recording photo vote:', err);
          return interaction.reply({
            content: `${config.emojis.error} Failed to record vote: ${err.message}`,
            ephemeral: true
          });
        }
      }

      // 2.1 User clicks "Submit Appeal" in DM or Jail Channel
      if (customId.startsWith('appeal_open_')) {
        try {
          const parts = customId.split('_');
          const guildId = parts[2];
          const punishmentType = parts[3];

          const modal = appealHelper.createAppealModal(guildId, punishmentType);
          await interaction.showModal(modal);
          return;
        } catch (err) {
          console.error('Error displaying appeal modal:', err);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: `${config.emojis.error} An error occurred while opening the appeal form. Please contact server administration.`,
              ephemeral: true
            }).catch(() => {});
          }
          return;
        }
      }

      // 2.15 Staff clicks "Chat Activate" in Jail Channel
      if (customId.startsWith('jail_chat_activate_')) {
        const targetUserId = customId.replace('jail_chat_activate_', '');
        const channel = interaction.channel;

        if (!channel || !channel.name.startsWith('jail-')) {
          return interaction.reply({
            content: `${config.emojis.error} This button can only be used in a jail quarantine channel.`,
            ephemeral: true
          });
        }

        // Only Admins & Moderators can activate chat
        const staffMember = interaction.member;
        if (!staffMember || (!staffMember.permissions.has(PermissionFlagsBits.Administrator) && !staffMember.permissions.has(PermissionFlagsBits.ModerateMembers))) {
          return interaction.reply({
            content: `${config.emojis.error} Only server **Administrators** and **Moderators** can activate chat in this channel.`,
            ephemeral: true
          });
        }

        try {
          // Enable SendMessages for the jailed user in this channel
          await channel.permissionOverwrites.edit(targetUserId, {
            SendMessages: true,
            AttachFiles: true,
            EmbedLinks: true,
            ReadMessageHistory: true,
            ViewChannel: true
          }, { reason: `Chat activated by ${interaction.user.tag}` });

          const chatEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('💬 Chat Activated')
            .setDescription(
              `Chat has been enabled for <@${targetUserId}> in this channel.\n` +
              `You can now discuss your case directly with the server moderation team.\n\n` +
              `*Staff can close this chat at any time by typing \`?chatstop\`.*`
            )
            .setFooter({ text: config.footerText })
            .setTimestamp();

          await channel.send({ embeds: [chatEmbed] });

          return interaction.reply({
            content: '✅ Chat has been activated for this channel.',
            ephemeral: true
          });
        } catch (err) {
          console.error('Error activating jail chat:', err);
          return interaction.reply({
            content: `${config.emojis.error} Failed to activate chat: ${err.message}`,
            ephemeral: true
          });
        }
      }

      // 2.18 Member clicks "Verify & Enter" button
      if (customId.startsWith('verify_member_')) {
        const roleId = customId.replace('verify_member_', '');
        const guild = interaction.guild;
        const member = interaction.member;

        let targetRole = null;
        if (roleId !== 'auto') {
          targetRole = guild.roles.cache.get(roleId);
        }
        if (!targetRole) {
          targetRole = guild.roles.cache.find(r => r.name === '✈️ㆍVerified' || r.name.toLowerCase().includes('verified') || r.name.toLowerCase() === 'aviator');
        }

        if (!targetRole) {
          return interaction.reply({
            content: `${config.emojis.error} Verification role could not be found. Please contact an Administrator.`,
            ephemeral: true
          });
        }

        if (member.roles.cache.has(targetRole.id)) {
          return interaction.reply({
            content: `ℹ️ You are already verified with the **@${targetRole.name}** role!`,
            ephemeral: true
          });
        }

        try {
          await member.roles.add(targetRole, 'Server member verification');

          // Send celebration welcome card in #verified-welcome
          const verificationService = require('../services/verificationService');
          verificationService.sendVerifiedWelcomeCard(member, guild).catch(err => {
            console.error('Error posting verified welcome card:', err);
          });

          const successEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('🎉 Verification Successful!')
            .setDescription(
              `Welcome to **${guild.name}**, ${member}!\n\n` +
              `You have been granted the **@${targetRole.name}** role and now have full access to all chat, spotting, media, and voice channels.\n\n` +
              `*Enjoy your stay and have fun!* ✈️`
            )
            .setFooter({ text: config.footerText })
            .setTimestamp();

          return interaction.reply({ embeds: [successEmbed], ephemeral: true });
        } catch (err) {
          console.error('Error assigning verification role:', err);
          return interaction.reply({
            content: `${config.emojis.error} Failed to grant verification role: ${err.message}`,
            ephemeral: true
          });
        }
      }
      if (customId.startsWith('appeal_accept_')) {
        const [, , guildId, targetUserId, punishmentType] = customId.split('_');
        const guild = interaction.guild || await client.guilds.fetch(guildId).catch(() => null);

        if (!guild) {
          return interaction.reply({ content: `${config.emojis.error} Could not locate guild.`, ephemeral: true });
        }

        const staffMember = await guild.members.fetch(interaction.user.id).catch(() => null);
        if (!staffMember || (!staffMember.permissions.has(PermissionFlagsBits.ModerateMembers) && !staffMember.permissions.has(PermissionFlagsBits.Administrator))) {
          return interaction.reply({
            content: `${config.emojis.error} You do not have permission to resolve appeals.`,
            ephemeral: true
          });
        }

        await interaction.deferUpdate();

        let actionDetails = '';
        const targetUser = await client.users.fetch(targetUserId).catch(() => null);

        try {
          const suspensionManager = require('../utils/suspensionManager');

          if (punishmentType === 'ban' || punishmentType === 'kick') {
            // Restore quarantined member
            await suspensionManager.restoreMember(guild, targetUserId);

            if (targetUser) {
              const dm = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle(`✅ Appeal Accepted • ${guild.name}`)
                .setDescription(`Your appeal for your **${punishmentType.toUpperCase()}** in **${guild.name}** has been accepted by the staff team! Your roles and full server access have been restored.`)
                .setFooter({ text: config.footerText })
                .setTimestamp();
              await targetUser.send({ embeds: [dm] }).catch(() => {});
            }
            actionDetails = 'Member restored & suspension lifted.';
          } else if (punishmentType === 'timeout') {
            const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
            if (targetMember) {
              await targetMember.timeout(null, `Appeal accepted by ${interaction.user.tag}`);
            }
            if (targetUser) {
              const dm = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle(`✅ Timeout Appeal Accepted • ${guild.name}`)
                .setDescription(`Your timeout in **${guild.name}** has been lifted by the staff team!`)
                .setFooter({ text: config.footerText })
                .setTimestamp();
              await targetUser.send({ embeds: [dm] }).catch(() => {});
            }
            actionDetails = 'Timeout lifted successfully.';
          }
        } catch (e) {
          console.error('Error executing appeal action:', e);
          actionDetails = `Action completed with notice: ${e.message}`;
        }

        // Update original appeal message
        const originalEmbed = interaction.message.embeds[0];
        const updatedEmbed = EmbedBuilder.from(originalEmbed)
          .setColor(config.colors.success)
          .spliceFields(-1, 1, {
            name: 'Status',
            value: `✅ **ACCEPTED** by ${interaction.user} (<t:${Math.floor(Date.now() / 1000)}:R>)\n*${actionDetails}*`
          });

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('appeal_accepted_btn')
            .setLabel(`Accepted by ${interaction.user.username}`)
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
        );

        await interaction.message.edit({ embeds: [updatedEmbed], components: [disabledRow] });
        return;
      }

      // 2.3 Staff clicks "Reject Appeal"
      if (customId.startsWith('appeal_reject_')) {
        const [, , guildId, targetUserId, punishmentType] = customId.split('_');
        const guild = interaction.guild || await client.guilds.fetch(guildId).catch(() => null);

        if (!guild) {
          return interaction.reply({ content: `${config.emojis.error} Could not locate guild.`, ephemeral: true });
        }

        const staffMember = await guild.members.fetch(interaction.user.id).catch(() => null);
        if (!staffMember || (!staffMember.permissions.has(PermissionFlagsBits.ModerateMembers) && !staffMember.permissions.has(PermissionFlagsBits.Administrator))) {
          return interaction.reply({
            content: `${config.emojis.error} You do not have permission to resolve appeals.`,
            ephemeral: true
          });
        }

        await interaction.deferUpdate();

        const suspensionManager = require('../utils/suspensionManager');
        const targetUser = await client.users.fetch(targetUserId).catch(() => null);

        if (targetUser) {
          const dm = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle(`❌ Appeal Rejected • ${guild.name}`)
            .setDescription(`Your appeal for your **${punishmentType.toUpperCase()}** in **${guild.name}** has been reviewed and rejected by the staff team. The punishment will now be finalized.`)
            .setFooter({ text: config.footerText })
            .setTimestamp();
          await targetUser.send({ embeds: [dm] }).catch(() => {});
        }

        // Finalize (ban or kick immediately)
        await suspensionManager.finalizePunishment(guild, targetUserId, punishmentType, 'Appeal rejected by staff');

        // Update original appeal message
        const originalEmbed = interaction.message.embeds[0];
        const updatedEmbed = EmbedBuilder.from(originalEmbed)
          .setColor(config.colors.error)
          .spliceFields(-1, 1, {
            name: 'Status',
            value: `❌ **REJECTED** by ${interaction.user} (<t:${Math.floor(Date.now() / 1000)}:R>)`
          });

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('appeal_rejected_btn')
            .setLabel(`Rejected by ${interaction.user.username}`)
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true)
        );

        await interaction.message.edit({ embeds: [updatedEmbed], components: [disabledRow] });
        return;
      }
    }

    // -----------------------------------------------------------------
    // 3. Handle Modal Submit (User submits appeal form)
    // -----------------------------------------------------------------
    if (interaction.isModalSubmit()) {
      const customId = interaction.customId;

      if (customId.startsWith('appeal_submit_')) {
        const parts = customId.split('_');
        const guildId = parts[2];
        const punishmentType = parts[3];

        const reason = interaction.fields.getTextInputValue('appeal_reason');
        const context = interaction.fields.getTextInputValue('appeal_context') || 'None provided';

        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) {
          return interaction.reply({
            content: `${config.emojis.error} Could not locate the server to submit this appeal.`,
            ephemeral: true
          });
        }

        // Find or create the ⚖️ㆍappeals channel
        const appealsChannel = await appealHelper.getOrCreateAppealsChannel(guild);
        if (!appealsChannel) {
          return interaction.reply({
            content: `${config.emojis.error} Failed to route appeal to the staff appeals channel.`,
            ephemeral: true
          });
        }

        // Send Appeal Embed to Staff Appeals Channel
        const appealEmbed = new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle(`⚖️ Punishment Appeal • ${punishmentType.toUpperCase()}`)
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .addFields(
            {
              name: '👤 User',
              value: `${interaction.user.tag} (${interaction.user})\n\`${interaction.user.id}\``,
              inline: true
            },
            {
              name: '🔨 Punishment',
              value: `\`${punishmentType.toUpperCase()}\``,
              inline: true
            },
            {
              name: '📅 Submitted At',
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              inline: true
            },
            {
              name: '📝 Appeal Reason / Explanation',
              value: reason,
              inline: false
            },
            {
              name: '💬 Additional Context / Apology',
              value: context,
              inline: false
            },
            {
              name: 'Status',
              value: '⏳ **Pending Staff Review**',
              inline: false
            }
          )
          .setFooter({ text: `${config.footerText} • Click buttons below to resolve` })
          .setTimestamp();

        const staffRow = appealHelper.createAppealStaffRow(guildId, interaction.user.id, punishmentType);
        await appealsChannel.send({ embeds: [appealEmbed], components: [staffRow] });

        // Confirm to user in DM
        const confirmationEmbed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('✅ Appeal Submitted Successfully')
          .setDescription(`Your appeal for **${guild.name}** has been delivered to the staff team in ${appealsChannel.name}.\n\nYou will be notified via DM when a moderator reviews your request.`)
          .setFooter({ text: config.footerText })
          .setTimestamp();

        return interaction.reply({ embeds: [confirmationEmbed], ephemeral: true });
      }
    }

    // -----------------------------------------------------------------
    // 3. Handle Select Menu Interactions (Role Picker)
    // -----------------------------------------------------------------
    if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;

      if (customId.startsWith('select_role_')) {
        const catKey = customId.replace('select_role_', '');
        const rolePickerService = require('../services/rolePickerService');
        const catConfig = rolePickerService.ROLE_CATEGORIES[catKey];

        if (!catConfig) return;

        const guild = interaction.guild;
        const member = interaction.member;
        const selectedValues = interaction.values;

        await interaction.deferReply({ ephemeral: true });

        const addedRoles = [];
        const removedRoles = [];

        await rolePickerService.ensureRolesExist(guild);
        const rolesCache = await guild.roles.fetch();

        for (const roleDef of catConfig.roles) {
          const role = rolesCache.find(r => r.name.toLowerCase() === roleDef.name.toLowerCase());
          if (!role) continue;

          const isSelected = selectedValues.includes(roleDef.id);
          const hasRole = member.roles.cache.has(role.id);

          if (isSelected && !hasRole) {
            await member.roles.add(role, `Role Picker: ${catConfig.name}`).catch(() => {});
            addedRoles.push(`**@${role.name}**`);
          } else if (!isSelected && hasRole) {
            await member.roles.remove(role, `Role Picker: ${catConfig.name}`).catch(() => {});
            removedRoles.push(`~~@${role.name}~~`);
          }
        }

        let replyText = `🎨 **${catConfig.name}** updated!`;
        if (addedRoles.length > 0) replyText += `\n✨ **Granted:** ${addedRoles.join(', ')}`;
        if (removedRoles.length > 0) replyText += `\n🗑️ **Removed:** ${removedRoles.join(', ')}`;
        if (addedRoles.length === 0 && removedRoles.length === 0) replyText += `\n*No changes made.*`;

        return interaction.editReply({ content: replyText });
      }
    }
  }
};

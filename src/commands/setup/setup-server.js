const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');
const config = require('../../config');
const serverTemplate = require('../../templates/serverTemplate');
const componentsV2 = require('../../utils/componentsV2');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-server')
    .setDescription('Creates or configures all Aviation server categories, channels, and rules')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addBooleanOption(option =>
      option
        .setName('skip-confirmation')
        .setDescription('Skip confirmation prompt and execute immediately')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('recreate-existing')
        .setDescription('If true, creates new channels even if similarly named channels exist')
        .setRequired(false)
    ),

  async execute(interaction) {
    const skipConfirmation = interaction.options.getBoolean('skip-confirmation') || false;
    const recreateExisting = interaction.options.getBoolean('recreate-existing') || false;
    const guild = interaction.guild;

    if (!guild.members.me.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: `${config.emojis.error} I require **Administrator** permissions to create categories, channels, and configure permissions.`,
        ephemeral: true
      });
    }

    if (!skipConfirmation) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_setup')
          .setLabel('Confirm & Setup Server')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✈️'),
        new ButtonBuilder()
          .setCustomId('cancel_setup')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('✖️')
      );

      const confirmText = '# 🛫 Aviation Server Setup Confirmation\n\n' +
        'This command will configure the server with the complete **Aviation, Spotting & Flight Sim** architecture:\n\n' +
        '**Architecture Overview:**\n' +
        '• **Important**: `📰ㆍnews`, `📸ㆍinstagram`, `📜ㆍrules`, `👋ㆍwelcome`, `🎨ㆍroles`\n' +
        '• **General**: `💬ㆍchat`, `📷ㆍpic-rating`, `❓ㆍjetphotos`, `📸ㆍyour-photos`, `✈️ㆍaviation`, `🛫ㆍairport-discussion`, `💡ㆍquestions`, `🌍ㆍoff-topic`, `😂ㆍmemes`, `📸ㆍmedia`\n' +
        '• **Spotting**: `📍ㆍspotting-locations`, `🗓️ㆍspotting-plans`, `📆ㆍevents`, `🌤️ㆍweather`, `🎯ㆍrare-catches`, `📈ㆍflight-tracking`\n' +
        '• **Flight Sim**: `🛩️ㆍmsfs`, `✈️ㆍx-plane`, `🚁ㆍdcs`, `🎮ㆍother-sims`\n' +
        '• **Voice Channels**: `General VC`, `Spotting VC`, `Flight Sim VC`, `AFK`\n' +
        '• **Staff**: `📢ㆍstaff-news`, `💬ㆍstaff-chat`, `📳ㆍmoderators-chat`\n\n' +
        '• **Automated Actions**: Sets permissions, topics, and publishes the official Aviation Rules embed.\n\n' +
        'Would you like to start the setup?\n\n' +
        `*${config.footerText}*`;

      const confirmContainer = componentsV2.createContainer({
        accentColor: config.colors.primary,
        components: [
          componentsV2.createSection({ text: confirmText }),
          componentsV2.createActionRow(row.components.map(b => b.toJSON ? b.toJSON() : b.data || b))
        ]
      });

      const response = await interaction.reply({
        components: [confirmContainer],
        flags: 32768 | 64, // V2 + Ephemeral
        fetchReply: true
      });

      const filter = i => i.user.id === interaction.user.id;
      try {
        const confirmation = await response.awaitMessageComponent({ filter, time: 60000 });

        if (confirmation.customId === 'cancel_setup') {
          return confirmation.update({
            content: `${config.emojis.info} Server setup was cancelled.`,
            embeds: [],
            components: []
          });
        }

        await confirmation.update({
          content: '⏳ Starting automated aviation server setup... Please stand by for takeoff!',
          embeds: [],
          components: []
        });
      } catch {
        return interaction.editReply({
          content: '⏱️ Server setup confirmation timed out.',
          embeds: [],
          components: []
        });
      }
    } else {
      await interaction.deferReply({ ephemeral: true });
    }

    try {
      // 1. Create or Find Roles
      const createdRoles = new Map();
      const existingRoles = await guild.roles.fetch();

      for (const roleDef of serverTemplate.roles) {
        let role = existingRoles.find(r => r.name.toLowerCase() === roleDef.name.toLowerCase());
        if (!role) {
          role = await guild.roles.create({
            name: roleDef.name,
            color: roleDef.color,
            hoist: roleDef.hoist,
            permissions: roleDef.permissions,
            reason: 'Automated Aviation Server Setup'
          });
        }
        createdRoles.set(roleDef.name.toLowerCase(), role);
      }

      const modRole = createdRoles.get('moderator');
      const adminRole = createdRoles.get('admin');
      const everyoneRole = guild.roles.everyone;

      // 2. Fetch existing channels
      const existingChannels = await guild.channels.fetch();

      let createdCategoriesCount = 0;
      let createdChannelsCount = 0;
      let configuredChannelsCount = 0;
      let rulesChannelRef = null;
      let welcomeChannelRef = null;
      let rolesChannelRef = null;

      // 3. Process Categories & Channels
      for (const catDef of serverTemplate.categories) {
        // Find existing category or create new
        let category = !recreateExisting
          ? existingChannels.find(c => c && c.type === ChannelType.GuildCategory && c.name.toLowerCase() === catDef.name.toLowerCase())
          : null;

        const catOverwrites = [];
        if (catDef.staffOnly) {
          catOverwrites.push({
            id: everyoneRole.id,
            deny: [PermissionFlagsBits.ViewChannel]
          });
          if (modRole) {
            catOverwrites.push({
              id: modRole.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
            });
          }
          if (adminRole) {
            catOverwrites.push({
              id: adminRole.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
            });
          }
        }

        if (!category) {
          category = await guild.channels.create({
            name: catDef.name,
            type: ChannelType.GuildCategory,
            permissionOverwrites: catOverwrites,
            reason: 'Aviation Server Setup'
          });
          createdCategoriesCount++;
        } else if (catDef.staffOnly) {
          // Update staff category permissions if already existing
          await category.permissionOverwrites.set(catOverwrites).catch(() => {});
        }

        // Process channels inside category
        for (const chDef of catDef.channels) {
          let channel = !recreateExisting
            ? existingChannels.find(c => c && c.name === chDef.name && (c.parentId === category.id || !c.parentId))
            : null;

          const chOverwrites = [];
          if (chDef.readOnly) {
            chOverwrites.push({
              id: everyoneRole.id,
              deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads],
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
            });
            if (modRole) {
              chOverwrites.push({
                id: modRole.id,
                allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages]
              });
            }
          }

          if (!channel) {
            channel = await guild.channels.create({
              name: chDef.name,
              type: chDef.type,
              parent: category.id,
              topic: chDef.topic || null,
              permissionOverwrites: chOverwrites.length > 0 ? chOverwrites : undefined,
              reason: 'Aviation Server Setup'
            });
            createdChannelsCount++;
          } else {
            // Update parent and topic if needed
            if (channel.parentId !== category.id || (chDef.topic && channel.topic !== chDef.topic)) {
              await channel.edit({
                parent: category.id,
                topic: chDef.topic || channel.topic
              }).catch(() => {});
            }
            if (chOverwrites.length > 0) {
              await channel.permissionOverwrites.set(chOverwrites).catch(() => {});
            }
            configuredChannelsCount++;
          }

          // Track specific channels
          if (chDef.isRulesChannel || chDef.name.includes('rules')) rulesChannelRef = channel;
          if (chDef.name.includes('welcome')) welcomeChannelRef = channel;
          if (chDef.name.includes('roles')) rolesChannelRef = channel;
        }
      }

      // 4. Post Server Rules
      if (rulesChannelRef) {
        const rulesData = serverTemplate.rulesContent;
        let rulesText = `# ${rulesData.title}\n\n`;
        if (rulesData.description) rulesText += `${rulesData.description}\n\n`;
        if (rulesData.fields) {
          rulesText += rulesData.fields.map(f => `**${f.name}**\n${f.value}`).join('\n\n') + '\n\n';
        }
        rulesText += `*${rulesData.footer} • ${config.footerText}*`;

        const rulesContainer = componentsV2.createContainer({
          accentColor: config.colors.primary,
          components: [ componentsV2.createSection({ text: rulesText }) ]
        });

        await componentsV2.sendToChannel(interaction.client, rulesChannelRef.id, [rulesContainer]).catch(() => {});
      }

      // 5. Post Welcome Message if clean
      if (welcomeChannelRef) {
        const welcomeText = '# 🛫 Welcome to the Aviation & Spotting Community!\n\n' +
          'Welcome aboard! We are thrilled to have you here.\n\n' +
          '**Quick Start Checklist:**\n' +
          `• Check out ${rulesChannelRef || 'our rules'} before posting.\n` +
          `• Grab your roles in ${rolesChannelRef || '#roles'}.\n` +
          '• Introduce yourself and share your favorite aircraft or spotting gear in `#💬ㆍchat` or `#📸ㆍyour-photos`!\n\n' +
          '*Clear skies and happy spotting!*\n\n' +
          `*${config.footerText}*`;

        const welcomeContainer = componentsV2.createContainer({
          accentColor: config.colors.info,
          components: [ componentsV2.createSection({ text: welcomeText }) ]
        });

        await componentsV2.sendToChannel(interaction.client, welcomeChannelRef.id, [welcomeContainer]).catch(() => {});
      }

      const summaryText = `# ${config.emojis.success} Aviation Server Setup Finished!\n\n` +
        `Server layout and custom rules have been successfully applied to **${guild.name}**!\n\n` +
        `**📁 Categories**\n\`${createdCategoriesCount}\` created\n\n` +
        `**# Channels**\n\`${createdChannelsCount}\` created, \`${configuredChannelsCount}\` configured\n\n` +
        `**📜 Rules Channel**\n${rulesChannelRef ? `${rulesChannelRef}` : 'Configured'}\n\n` +
        `**👋 Welcome Channel**\n${welcomeChannelRef ? `${welcomeChannelRef}` : 'Configured'}\n\n` +
        `*${config.footerText}*`;

      const summaryContainer = componentsV2.createContainer({
        accentColor: config.colors.success,
        components: [ componentsV2.createSection({ text: summaryText }) ]
      });

      await componentsV2.editInteractionReply(interaction, [summaryContainer]);
    } catch (error) {
      console.error('Error during setup execution:', error);
      const errText = `# ${config.emojis.error} Setup Failed\n\n` +
        `An error occurred while setting up the server:\n\`\`\`${error.message}\`\`\`\n\n` +
        `*${config.footerText}*`;

      const errContainer = componentsV2.createContainer({
        accentColor: config.colors.error,
        components: [ componentsV2.createSection({ text: errText }) ]
      });

      await componentsV2.editInteractionReply(interaction, [errContainer]);
    }
  }
};

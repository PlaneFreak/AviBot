const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

const VERIFIED_ROLE_NAME = '✈️ㆍVerified';
const VERIFY_CHANNEL_NAME = '✅ㆍverify';
const WELCOME_CHANNEL_NAME = '👋ㆍwelcome';

module.exports = {
  VERIFIED_ROLE_NAME,
  VERIFY_CHANNEL_NAME,
  WELCOME_CHANNEL_NAME,

  /**
   * Finds or creates the Verified role
   */
  async getOrCreateVerifiedRole(guild) {
    let role = guild.roles.cache.find(r => r.name === VERIFIED_ROLE_NAME || r.name.toLowerCase().includes('verified'));
    if (!role) {
      role = await guild.roles.create({
        name: VERIFIED_ROLE_NAME,
        color: 0x2ECC71,
        hoist: false,
        permissions: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AddReactions,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak
        ],
        reason: 'Auto-creation of Verified member role'
      });
    }
    return role;
  },

  /**
   * Finds or creates the ✅ㆍverify channel (visible ONLY to unverified members)
   */
  async getOrCreateVerifyChannel(guild) {
    const channels = await guild.channels.fetch();
    let channel = channels.find(
      c => c && c.type === ChannelType.GuildText && (c.name === VERIFY_CHANNEL_NAME || c.name.toLowerCase().includes('verify'))
    );

    const verifiedRole = await this.getOrCreateVerifiedRole(guild);
    const everyoneRole = guild.roles.everyone;

    const category = channels.find(
      c => c && c.type === ChannelType.GuildCategory && (c.name.toLowerCase().includes('important') || c.name.toLowerCase().includes('welcome'))
    );

    const overwrites = [
      {
        id: everyoneRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
        deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.CreatePublicThreads]
      },
      {
        id: verifiedRole.id,
        deny: [PermissionFlagsBits.ViewChannel] // Hide verify channel once verified
      }
    ];

    if (!channel) {
      channel = await guild.channels.create({
        name: VERIFY_CHANNEL_NAME,
        type: ChannelType.GuildText,
        parent: category ? category.id : null,
        position: 0,
        topic: 'Click the verify button to access all server channels and protect against bots.',
        permissionOverwrites: overwrites,
        reason: 'Auto-creation of verification channel'
      });
    } else {
      await channel.permissionOverwrites.set(overwrites).catch(() => {});
    }

    return channel;
  },

  /**
   * Finds or creates the unverified 👋ㆍwelcome channel (visible ONLY to unverified members)
   */
  async getOrCreateUnverifiedWelcomeChannel(guild) {
    const channels = await guild.channels.fetch();
    const verifiedRole = await this.getOrCreateVerifiedRole(guild);
    const everyoneRole = guild.roles.everyone;

    const category = channels.find(
      c => c && c.type === ChannelType.GuildCategory && (c.name.toLowerCase().includes('important') || c.name.toLowerCase().includes('welcome'))
    );

    // Look for channel named welcome that is designated for unverified (or has everyone view allowed)
    let channel = channels.find(
      c => c && c.type === ChannelType.GuildText && c.name === WELCOME_CHANNEL_NAME &&
      (c.topic?.includes('verify') || c.permissionOverwrites.cache.get(everyoneRole.id)?.allow.has(PermissionFlagsBits.ViewChannel))
    );

    const overwrites = [
      {
        id: everyoneRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
        deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.CreatePublicThreads]
      },
      {
        id: verifiedRole.id,
        deny: [PermissionFlagsBits.ViewChannel] // Hidden from verified members
      }
    ];

    if (!channel) {
      channel = await guild.channels.create({
        name: WELCOME_CHANNEL_NAME,
        type: ChannelType.GuildText,
        parent: category ? category.id : null,
        position: 1,
        topic: 'Welcome to the community! Please verify in #verify to unlock all channels.',
        permissionOverwrites: overwrites,
        reason: 'Auto-creation of unverified welcome channel'
      });
    } else {
      await channel.permissionOverwrites.set(overwrites).catch(() => {});
    }

    return channel;
  },

  /**
   * Finds or creates the verified 👋ㆍwelcome channel (visible ONLY to verified members)
   */
  async getOrCreateVerifiedWelcomeChannel(guild) {
    const channels = await guild.channels.fetch();
    const verifiedRole = await this.getOrCreateVerifiedRole(guild);
    const everyoneRole = guild.roles.everyone;

    const category = channels.find(
      c => c && c.type === ChannelType.GuildCategory && (c.name.toLowerCase().includes('important') || c.name.toLowerCase().includes('welcome'))
    );

    // Look for channel named welcome that is designated for verified (or has everyone view denied)
    let channel = channels.find(
      c => c && c.type === ChannelType.GuildText && c.name === WELCOME_CHANNEL_NAME &&
      (c.topic?.includes('arrivals') || c.permissionOverwrites.cache.get(everyoneRole.id)?.deny.has(PermissionFlagsBits.ViewChannel))
    );

    const overwrites = [
      {
        id: everyoneRole.id,
        deny: [PermissionFlagsBits.ViewChannel] // Hidden from unverified
      },
      {
        id: verifiedRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
        deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.CreatePublicThreads]
      }
    ];

    if (!channel) {
      channel = await guild.channels.create({
        name: WELCOME_CHANNEL_NAME,
        type: ChannelType.GuildText,
        parent: category ? category.id : null,
        position: 2,
        topic: 'Official arrivals and welcome lounge for verified community members.',
        permissionOverwrites: overwrites,
        reason: 'Auto-creation of verified welcome channel'
      });
    } else {
      await channel.permissionOverwrites.set(overwrites).catch(() => {});
    }

    return channel;
  },

  /**
   * Configures channel permissions:
   * - Unverified (@everyone): ONLY sees unverified #welcome and #verify.
   * - Verified (@✈️ㆍVerified): Sees verified #welcome and all other server channels.
   */
  async applyStrictVerificationPermissions(guild) {
    const verifiedRole = await this.getOrCreateVerifiedRole(guild);
    const everyoneRole = guild.roles.everyone;
    const modRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'moderator' || r.name.toLowerCase().includes('mod'));
    const adminRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'admin' || r.permissions.has(PermissionFlagsBits.Administrator));
    const channels = await guild.channels.fetch();

    console.log(`🔒 Applying strict verification permissions across ${channels.size} channels in ${guild.name}...`);

    for (const [, channel] of channels) {
      if (!channel) continue;

      const chName = channel.name.toLowerCase();

      const isVerify = chName.includes('verify');
      const isStaff = chName.includes('staff') || chName.includes('mod-log') || chName.includes('admin');
      const isJail = chName.includes('jail') || chName.includes('quarantine') || chName.includes('appeal-hub');

      // Skip quarantine/jail channels
      if (isJail) continue;

      // 1. Verify Channel: Visible ONLY to unverified, hidden to verified
      if (isVerify) {
        await channel.permissionOverwrites.edit(everyoneRole, {
          ViewChannel: true,
          ReadMessageHistory: true,
          SendMessages: false
        }).catch(() => {});

        await channel.permissionOverwrites.edit(verifiedRole, {
          ViewChannel: false
        }).catch(() => {});
        continue;
      }

      // 2. Welcome Channels: check topic or permissions to distinguish unverified vs verified
      if (channel.name === WELCOME_CHANNEL_NAME || chName.includes('welcome')) {
        const isVerifiedWelcome = channel.topic?.includes('arrivals') || channel.permissionOverwrites.cache.get(everyoneRole.id)?.deny.has(PermissionFlagsBits.ViewChannel);

        if (isVerifiedWelcome) {
          // Verified welcome channel: visible ONLY to verified
          await channel.permissionOverwrites.edit(everyoneRole, {
            ViewChannel: false
          }).catch(() => {});

          await channel.permissionOverwrites.edit(verifiedRole, {
            ViewChannel: true,
            ReadMessageHistory: true,
            SendMessages: false
          }).catch(() => {});
        } else {
          // Unverified welcome channel: visible ONLY to unverified
          await channel.permissionOverwrites.edit(everyoneRole, {
            ViewChannel: true,
            ReadMessageHistory: true,
            SendMessages: false
          }).catch(() => {});

          await channel.permissionOverwrites.edit(verifiedRole, {
            ViewChannel: false
          }).catch(() => {});
        }
        continue;
      }

      // 3. Staff Channels / Category: Staff only
      if (isStaff) {
        await channel.permissionOverwrites.edit(everyoneRole, { ViewChannel: false }).catch(() => {});
        await channel.permissionOverwrites.edit(verifiedRole, { ViewChannel: false }).catch(() => {});
        if (modRole) await channel.permissionOverwrites.edit(modRole, { ViewChannel: true }).catch(() => {});
        if (adminRole) await channel.permissionOverwrites.edit(adminRole, { ViewChannel: true }).catch(() => {});
        continue;
      }

      // 4. All Other Channels & Categories (Rules, News, Roles, Chat, Spotting, Sims, Voice, Leaderboards, etc.)
      // MUST BE STRICTLY HIDDEN FROM @everyone AND UNLOCKED FOR @✈️ㆍVerified
      await channel.permissionOverwrites.edit(everyoneRole, {
        ViewChannel: false
      }).catch(() => {});

      await channel.permissionOverwrites.edit(verifiedRole, {
        ViewChannel: true
      }).catch(() => {});
    }

    console.log(`✅ Strict verification permissions successfully applied in ${guild.name}!`);
  },

  /**
   * Posts celebration card in the verified #welcome channel when a member completes verification
   * (Always posts a brand-new message, never edits!)
   */
  async sendVerifiedWelcomeCard(member, guild) {
    const verifiedWelcomeChannel = await this.getOrCreateVerifiedWelcomeChannel(guild);
    if (!verifiedWelcomeChannel) return;

    const channels = await guild.channels.fetch();
    const chatChannel = channels.find(c => c && c.name.toLowerCase().includes('chat') && !c.name.includes('staff'));
    const picRatingChannel = channels.find(c => c && c.name.toLowerCase().includes('pic-rating'));
    const rolesChannel = channels.find(c => c && c.name.toLowerCase().includes('roles'));

    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setAuthor({
        name: `✈️ New Aviator Aboard!`,
        iconURL: member.user.displayAvatarURL({ dynamic: true })
      })
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setDescription(
        `Welcome to **${guild.name}**, ${member}!\n\n` +
        `🎉 You are officially verified as member **#${guild.memberCount}**!\n\n` +
        `**Next Steps:**\n` +
        `• Chat with the community in ${chatChannel || '#chat'}\n` +
        `• Upload & rate spotter photos in ${picRatingChannel || '#pic-rating'}\n` +
        `• Pick up your custom roles in ${rolesChannel || '#roles'}\n\n` +
        `*Fasten your seatbelts and enjoy your stay!* 🛫`
      )
      .setFooter({ text: `${config.footerText} • Verified Arrival` })
      .setTimestamp();

    // ALWAYS SEND A BRAND-NEW MESSAGE (DO NOT EDIT)
    await verifiedWelcomeChannel.send({
      content: `🎉 Welcome aboard, ${member}!`,
      embeds: [welcomeEmbed]
    });
  },

  /**
   * Ensures the Welcome Embed is posted in the unverified #welcome channel
   * (Always sends a brand-new message, never edits, purges old German messages!)
   */
  async ensureWelcomeMessage(guild) {
    const unverifiedWelcomeChannel = await this.getOrCreateUnverifiedWelcomeChannel(guild);
    const verifyChannel = await this.getOrCreateVerifyChannel(guild);

    if (!unverifiedWelcomeChannel) return;

    const verifyMention = verifyChannel ? `<#${verifyChannel.id}>` : '**#✅ㆍverify**';

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`🛫 Welcome to ${guild.name}!`)
      .setDescription(
        `### 🔒 Verification Required to Unlock Server\n\n` +
        `Welcome to our Aviation & Plane Spotting Community!\n` +
        `To protect our server against automated spam bots, all channels are currently hidden.\n\n` +
        `👉 **Please head over to ${verifyMention} and click the \`✅ Verify & Enter\` button!**\n\n` +
        `Once verified, all chat lounges, photo rating contests, spotting discussions, and voice channels will unlock immediately!`
      )
      .setFooter({ text: `${config.footerText} • Verification Required` })
      .setTimestamp();

    const messages = await unverifiedWelcomeChannel.messages.fetch({ limit: 20 }).catch(() => null);
    if (messages) {
      for (const [, msg] of messages) {
        // Delete old messages containing German text or previous bot welcome templates
        const hasGerman = msg.embeds.some(e =>
          (e.description && (e.description.includes('DU MUSST') || e.description.includes('Um Zugriff') || e.description.includes('Klicke auf')))
        );
        if (hasGerman && msg.author.id === guild.client.user.id) {
          await msg.delete().catch(() => {});
        }
      }
    }

    // Check if clean English embed exists
    const refreshedMessages = await unverifiedWelcomeChannel.messages.fetch({ limit: 10 }).catch(() => null);
    const hasEnglishWelcome = refreshedMessages && refreshedMessages.some(m =>
      m.author.id === guild.client.user.id &&
      m.embeds.some(e => e.title?.includes('Welcome to') && e.description?.includes('Verification Required'))
    );

    if (!hasEnglishWelcome) {
      await unverifiedWelcomeChannel.send({ embeds: [embed] });
      console.log(`✅ Clean English Welcome Embed sent to #${unverifiedWelcomeChannel.name} (${guild.name})`);
    }
  },

  /**
   * Ensures an initial navigation overview is posted in the verified #welcome channel
   */
  async ensureVerifiedWelcomeHeader(guild) {
    const verifiedWelcomeChannel = await this.getOrCreateVerifiedWelcomeChannel(guild);
    if (!verifiedWelcomeChannel) return;

    const channels = await guild.channels.fetch();
    const chatChannel = channels.find(c => c && c.name.toLowerCase().includes('chat') && !c.name.includes('staff'));
    const picRatingChannel = channels.find(c => c && c.name.toLowerCase().includes('pic-rating'));
    const rolesChannel = channels.find(c => c && c.name.toLowerCase().includes('roles'));
    const rulesChannel = channels.find(c => c && c.name.toLowerCase().includes('rules'));

    const messages = await verifiedWelcomeChannel.messages.fetch({ limit: 10 }).catch(() => null);
    const hasHeader = messages && messages.some(m => m.author.id === guild.client.user.id && m.embeds.length > 0);

    if (!hasHeader) {
      const headerEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`🛫 Community Arrivals & Member Lounge`)
        .setDescription(
          `Welcome to the official verified arrivals lounge of **${guild.name}**!\n\n` +
          `Whenever a new member completes verification, they will be greeted here.\n\n` +
          `**Quick Navigation:**\n` +
          `• 💬 **General Chat:** <#${chatChannel?.id || 'chat'}> — Daily aviation talk & banter\n` +
          `• 📷 **Photo Rating:** <#${picRatingChannel?.id || 'pic-rating'}> — Spotter photo contests & leaderboards\n` +
          `• 🎨 **Role Picker:** <#${rolesChannel?.id || 'roles'}> — Select notification and hobby roles\n` +
          `• 📜 **Guidelines:** <#${rulesChannel?.id || 'rules'}> — Server rules and spotter code`
        )
        .setFooter({ text: `${config.footerText} • Verified Lounge` })
        .setTimestamp();

      await verifiedWelcomeChannel.send({ embeds: [headerEmbed] });
    }
  },

  /**
   * Ensures the Verification Panel is posted in #verify
   */
  async ensureVerificationPanel(guild) {
    const channel = await this.getOrCreateVerifyChannel(guild);
    const verifiedRole = await this.getOrCreateVerifiedRole(guild);
    await this.getOrCreateUnverifiedWelcomeChannel(guild);
    await this.getOrCreateVerifiedWelcomeChannel(guild);

    // Apply strict permissions across server
    await this.applyStrictVerificationPermissions(guild);

    // Ensure welcome messages in both channels
    await this.ensureWelcomeMessage(guild);
    await this.ensureVerifiedWelcomeHeader(guild);

    // Check if verify panel already exists
    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    const hasPanel = messages && messages.some(m => m.author.id === guild.client.user.id && m.embeds.length > 0);

    if (hasPanel) return;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🛡️ Anti-Bot & Member Verification')
      .setDescription(
        `Welcome to **${guild.name}**!\n\n` +
        `To protect our community from raid bots and automated spam accounts, please click the **Verify & Enter** button below.\n\n` +
        `**What happens next?**\n` +
        `• You will receive the **@✈️ㆍVerified** role.\n` +
        `• All chat, photo sharing, voice lounges, and spotting channels will unlock immediately!`
      )
      .addFields(
        {
          name: '📜 Community Agreement',
          value: 'By verifying, you agree to treat other members with respect and follow server guidelines.',
          inline: false
        }
      )
      .setFooter({ text: `${config.footerText} • 1-Click Verification System` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`verify_member_${verifiedRole.id}`)
        .setLabel('Verify & Enter')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
    );

    await channel.send({ embeds: [embed], components: [row] });
    console.log(`✅ Verification panel published in #${channel.name} (${guild.name})`);
  }
};

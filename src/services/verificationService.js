const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const componentsV2 = require('../utils/componentsV2');

const VERIFIED_ROLE_NAME = '✈️ㆍVerified';
const VERIFY_CHANNEL_NAME = '✅ㆍverify';
const UNVERIFIED_WELCOME_CHANNEL_NAME = '👋ㆍwelcome';
const VERIFIED_WELCOME_CHANNEL_NAME = '🎉ㆍverified-welcome';

module.exports = {
  VERIFIED_ROLE_NAME,
  VERIFY_CHANNEL_NAME,
  UNVERIFIED_WELCOME_CHANNEL_NAME,
  VERIFIED_WELCOME_CHANNEL_NAME,
  WELCOME_CHANNEL_NAME: UNVERIFIED_WELCOME_CHANNEL_NAME,

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
   * Finds or creates the ✅ㆍverify channel (visible ONLY to unverified members, strictly locked)
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
        deny: [
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.SendMessagesInThreads,
          PermissionFlagsBits.CreatePublicThreads,
          PermissionFlagsBits.CreatePrivateThreads,
          PermissionFlagsBits.AddReactions,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.UseApplicationCommands
        ]
      },
      {
        id: verifiedRole.id,
        deny: [PermissionFlagsBits.ViewChannel] // Strictly hide verify channel once verified
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
   * Finds or creates the unverified 👋ㆍwelcome channel (visible ONLY to unverified members, strictly locked)
   */
  async getOrCreateUnverifiedWelcomeChannel(guild) {
    const channels = await guild.channels.fetch();
    const verifiedRole = await this.getOrCreateVerifiedRole(guild);
    const everyoneRole = guild.roles.everyone;

    const category = channels.find(
      c => c && c.type === ChannelType.GuildCategory && (c.name.toLowerCase().includes('important') || c.name.toLowerCase().includes('welcome'))
    );

    // Look for channel designated for unverified welcome
    let channel = channels.find(
      c => c && c.type === ChannelType.GuildText &&
      (c.id === '1525420784103723079' || (c.name === UNVERIFIED_WELCOME_CHANNEL_NAME && !c.topic?.includes('arrivals')))
    );

    const overwrites = [
      {
        id: everyoneRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
        deny: [
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.SendMessagesInThreads,
          PermissionFlagsBits.CreatePublicThreads,
          PermissionFlagsBits.CreatePrivateThreads,
          PermissionFlagsBits.AddReactions,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.UseApplicationCommands
        ]
      },
      {
        id: verifiedRole.id,
        deny: [PermissionFlagsBits.ViewChannel] // Strictly hidden from verified members
      }
    ];

    if (!channel) {
      channel = await guild.channels.create({
        name: UNVERIFIED_WELCOME_CHANNEL_NAME,
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
   * Finds or creates the verified 🎉ㆍverified-welcome channel (visible ONLY to verified members)
   */
  async getOrCreateVerifiedWelcomeChannel(guild) {
    const channels = await guild.channels.fetch();
    const verifiedRole = await this.getOrCreateVerifiedRole(guild);
    const everyoneRole = guild.roles.everyone;

    const category = channels.find(
      c => c && c.type === ChannelType.GuildCategory && (c.name.toLowerCase().includes('important') || c.name.toLowerCase().includes('welcome'))
    );

    // Look for channel named verified-welcome or topic containing arrivals
    let channel = channels.find(
      c => c && c.type === ChannelType.GuildText &&
      (c.name === VERIFIED_WELCOME_CHANNEL_NAME || c.topic?.includes('arrivals') || (c.name.toLowerCase().includes('welcome') && c.id !== '1525420784103723079' && c.permissionOverwrites.cache.get(everyoneRole.id)?.deny.has(PermissionFlagsBits.ViewChannel)))
    );

    const overwrites = [
      {
        id: everyoneRole.id,
        deny: [PermissionFlagsBits.ViewChannel] // Hidden from unverified
      },
      {
        id: verifiedRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
        deny: [
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.SendMessagesInThreads,
          PermissionFlagsBits.CreatePublicThreads,
          PermissionFlagsBits.CreatePrivateThreads,
          PermissionFlagsBits.AddReactions
        ]
      }
    ];

    if (!channel) {
      channel = await guild.channels.create({
        name: VERIFIED_WELCOME_CHANNEL_NAME,
        type: ChannelType.GuildText,
        parent: category ? category.id : null,
        position: 2,
        topic: 'Official arrivals and welcome lounge for verified community members.',
        permissionOverwrites: overwrites,
        reason: 'Auto-creation of verified welcome channel'
      });
    } else {
      if (channel.name !== VERIFIED_WELCOME_CHANNEL_NAME) {
        await channel.setName(VERIFIED_WELCOME_CHANNEL_NAME, 'Rename verified welcome channel').catch(() => {});
      }
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
      const parentName = channel.parent ? channel.parent.name.toLowerCase() : '';

      const isVerify = chName.includes('verify');
      const isHoneypot = chName.includes('do-not-type') || chName.includes('trap');
      const isVipChannel = chName.includes('vip') || parentName.includes('vip') || (channel.type === ChannelType.GuildCategory && chName.includes('vip'));
      const isStaff =
        chName.includes('staff') ||
        chName.includes('mod') ||
        chName.includes('admin') ||
        chName.includes('appeal') ||
        parentName.includes('staff') ||
        (channel.type === ChannelType.GuildCategory && chName.includes('staff'));
      const isJail = chName.includes('jail') || chName.includes('quarantine') || chName.includes('appeal-hub');

      // Skip quarantine/jail and VIP lounge channels
      if (isJail || isVipChannel) continue;

      // Honeypot Trap Channel: Visible and typeable for everyone so the trap triggers
      if (isHoneypot) {
        await channel.permissionOverwrites.edit(everyoneRole, {
          ViewChannel: true,
          ReadMessageHistory: true,
          SendMessages: true
        }).catch(() => {});

        await channel.permissionOverwrites.edit(verifiedRole, {
          ViewChannel: true,
          ReadMessageHistory: true,
          SendMessages: true
        }).catch(() => {});
        continue;
      }

      // 1. Verify Channel: Visible ONLY to unverified, strictly locked and hidden to verified
      if (isVerify) {
        await channel.permissionOverwrites.edit(everyoneRole, {
          ViewChannel: true,
          ReadMessageHistory: true,
          SendMessages: false,
          SendMessagesInThreads: false,
          CreatePublicThreads: false,
          CreatePrivateThreads: false,
          AddReactions: false,
          AttachFiles: false,
          EmbedLinks: false,
          UseApplicationCommands: false
        }).catch(() => {});

        await channel.permissionOverwrites.edit(verifiedRole, {
          ViewChannel: false
        }).catch(() => {});
        continue;
      }

      // 2. Welcome Channels: check topic or permissions or name to distinguish unverified vs verified
      if (channel.name === UNVERIFIED_WELCOME_CHANNEL_NAME || channel.name === VERIFIED_WELCOME_CHANNEL_NAME || chName.includes('welcome')) {
        const isVerifiedWelcome =
          channel.name === VERIFIED_WELCOME_CHANNEL_NAME ||
          channel.topic?.includes('arrivals') ||
          (chName.includes('verified') && chName.includes('welcome')) ||
          (channel.id !== '1525420784103723079' && channel.permissionOverwrites.cache.get(everyoneRole.id)?.deny.has(PermissionFlagsBits.ViewChannel));

        if (isVerifiedWelcome) {
          if (channel.name !== VERIFIED_WELCOME_CHANNEL_NAME) {
            await channel.setName(VERIFIED_WELCOME_CHANNEL_NAME, 'Rename verified welcome channel').catch(() => {});
          }

          // Verified welcome channel: visible ONLY to verified
          await channel.permissionOverwrites.edit(everyoneRole, {
            ViewChannel: false
          }).catch(() => {});

          await channel.permissionOverwrites.edit(verifiedRole, {
            ViewChannel: true,
            ReadMessageHistory: true,
            SendMessages: false,
            SendMessagesInThreads: false,
            CreatePublicThreads: false,
            CreatePrivateThreads: false,
            AddReactions: false
          }).catch(() => {});
        } else {
          // Unverified welcome channel: visible ONLY to unverified, strictly locked
          await channel.permissionOverwrites.edit(everyoneRole, {
            ViewChannel: true,
            ReadMessageHistory: true,
            SendMessages: false,
            SendMessagesInThreads: false,
            CreatePublicThreads: false,
            CreatePrivateThreads: false,
            AddReactions: false,
            AttachFiles: false,
            EmbedLinks: false,
            UseApplicationCommands: false
          }).catch(() => {});

          await channel.permissionOverwrites.edit(verifiedRole, {
            ViewChannel: false
          }).catch(() => {});
        }
        continue;
      }

      // 3. Staff Channels / Category: Strictly hidden from ALL regular & verified members!
      if (isStaff) {
        // Explicitly deny @everyone AND @✈️ㆍVerified from viewing ANY staff channel
        await channel.permissionOverwrites.edit(everyoneRole, {
          ViewChannel: false
        }).catch(() => {});

        await channel.permissionOverwrites.edit(verifiedRole, {
          ViewChannel: false
        }).catch(() => {});

        // Check if channel is Admin-Only (e.g. staff-chat, admin-logs, bot-logs)
        const isAdminOnly = chName.includes('staff-chat') || chName.includes('admin') || chName.includes('bot-log');

        if (adminRole) {
          await channel.permissionOverwrites.edit(adminRole, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
          }).catch(() => {});
        }

        if (modRole) {
          if (isAdminOnly) {
            // Hidden from moderators
            await channel.permissionOverwrites.edit(modRole, {
              ViewChannel: false
            }).catch(() => {});
          } else {
            // Visible to moderators (e.g. moderators-chat, appeals, staff-news)
            await channel.permissionOverwrites.edit(modRole, {
              ViewChannel: true,
              SendMessages: true,
              ReadMessageHistory: true
            }).catch(() => {});
          }
        }
        continue;
      }

      // 4. All Other Channels & Categories (Rules, News, Roles, Chat, Spotting, Sims, Voice, Leaderboards, etc.)
      // MUST BE STRICTLY HIDDEN FROM @everyone AND UNLOCKED FOR @✈️ㆍVerified
      await channel.permissionOverwrites.edit(everyoneRole, {
        ViewChannel: false
      }).catch(() => {});

      const isReadOnlyForMembers =
        chName.includes('pic-rating') ||
        chName.includes('rules') ||
        chName.includes('roles') ||
        chName.includes('news') ||
        chName.includes('leaderboard') ||
        chName.includes('events');

      if (isReadOnlyForMembers) {
        await channel.permissionOverwrites.edit(verifiedRole, {
          ViewChannel: true,
          ReadMessageHistory: true,
          SendMessages: false,
          AddReactions: false,
          CreatePublicThreads: false,
          CreatePrivateThreads: false
        }).catch(() => {});
      } else {
        await channel.permissionOverwrites.edit(verifiedRole, {
          ViewChannel: true,
          ReadMessageHistory: true,
          SendMessages: true,
          AttachFiles: true,
          EmbedLinks: true
        }).catch(() => {});
      }
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

    const welcomeContainer = componentsV2.createContainer({
      accentColor: 0x2ECC71,
      components: [
        componentsV2.createSection({
          text: `**✈️ New Aviator Aboard!**\n\nWelcome to **${guild.name}**, ${member}!\n\n🎉 You are officially verified as member **#${guild.memberCount}**!\n\n**Next Steps:**\n• Chat with the community in ${chatChannel || '#chat'}\n• Upload & rate spotter photos in ${picRatingChannel || '#pic-rating'}\n• Pick up your custom roles in ${rolesChannel || '#roles'}\n\n*Fasten your seatbelts and enjoy your stay!* 🛫\n\n*${config.footerText} • Verified Arrival*`,
          accessory: componentsV2.createThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        })
      ]
    });

    // ALWAYS SEND A BRAND-NEW MESSAGE (DO NOT EDIT)
    await verifiedWelcomeChannel.send({ content: `🎉 Welcome aboard, ${member}!` });
    await componentsV2.sendToChannel(guild.client, verifiedWelcomeChannel.id, [welcomeContainer]);
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

    const welcomeContainer = componentsV2.createContainer({
      accentColor: config.colors.primary,
      components: [
        componentsV2.createSection({
          text: `# 🛫 Welcome to ${guild.name}!\n\n### 🔒 Verification Required to Unlock Server\n\nWelcome to our Aviation & Plane Spotting Community!\nTo protect our server against automated spam bots, all channels are currently hidden.\n\n👉 **Please head over to ${verifyMention} and click the \`✅ Verify & Enter\` button!**\n\nOnce verified, all chat lounges, photo rating contests, spotting discussions, and voice channels will unlock immediately!\n\n*${config.footerText} • Verification Required*`
        })
      ]
    });

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

    // Check if clean English embed exists (Since we use V2 now, the container will likely create an embed without a typical title, so let's adjust check)
    const refreshedMessages = await unverifiedWelcomeChannel.messages.fetch({ limit: 10 }).catch(() => null);
    const hasEnglishWelcome = refreshedMessages && refreshedMessages.some(m =>
      m.author.id === guild.client.user.id &&
      m.embeds.some(e => e.description?.includes('Verification Required'))
    );

    if (!hasEnglishWelcome) {
      await componentsV2.sendToChannel(guild.client, unverifiedWelcomeChannel.id, [welcomeContainer]);
      console.log(`✅ Clean English Welcome Container sent to #${unverifiedWelcomeChannel.name} (${guild.name})`);
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
      const headerContainer = componentsV2.createContainer({
        accentColor: config.colors.primary,
        components: [
          componentsV2.createSection({
            text: `# 🛫 Community Arrivals & Member Lounge\n\nWelcome to the official verified arrivals lounge of **${guild.name}**!\n\nWhenever a new member completes verification, they will be greeted here.\n\n**Quick Navigation:**\n• 💬 **General Chat:** <#${chatChannel?.id || 'chat'}> — Daily aviation talk & banter\n• 📷 **Photo Rating:** <#${picRatingChannel?.id || 'pic-rating'}> — Spotter photo contests & leaderboards\n• 🎨 **Role Picker:** <#${rolesChannel?.id || 'roles'}> — Select notification and hobby roles\n• 📜 **Guidelines:** <#${rulesChannel?.id || 'rules'}> — Server rules and spotter code\n\n*${config.footerText} • Verified Lounge*`
          })
        ]
      });

      await componentsV2.sendToChannel(guild.client, verifiedWelcomeChannel.id, [headerContainer]);
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
    let hasPanel = false;
    if (messages && messages.size > 0) {
      for (const [, msg] of messages) {
        if (msg.author.id === guild.client.user.id) {
          if (msg.flags.has(32768)) {
            hasPanel = true;
          } else {
            await msg.delete().catch(() => {});
          }
        }
      }
    }

    if (hasPanel) return;

    const container = componentsV2.createContainer({
      accentColor: config.colors.primary,
      components: [
        componentsV2.createSection({
          text:
            `# 🛡️ Anti-Bot & Member Verification\n\n` +
            `Welcome to **${guild.name}**!\n\n` +
            `To protect our aviation community from raid bots and automated spam accounts, please click the **Verify & Enter** button below.\n\n` +
            `**What happens next?**\n` +
            `• You will receive the **@✈️ㆍVerified** role.\n` +
            `• All chat, photo sharing, voice lounges, and spotting channels will unlock immediately!\n\n` +
            `*By verifying, you agree to treat other members with respect and follow server guidelines.*`,
          accessory: componentsV2.createThumbnail('https://cdn-icons-png.flaticon.com/512/3125/3125713.png')
        }),
        componentsV2.createActionRow([
          componentsV2.createButton({
            customId: `verify_member_${verifiedRole.id}`,
            label: 'Verify & Enter',
            style: 3, // Success green
            emoji: '✅'
          })
        ])
      ]
    });

    await componentsV2.sendToChannel(guild.client, channel.id, [container]).catch(err => {
      console.error('Failed to send Components V2 verify panel:', err);
    });
    console.log(`✅ Components V2 Verification panel published in #${channel.name} (${guild.name})`);
  }
};

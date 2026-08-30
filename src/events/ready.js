const { Events, ActivityType, ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`=========================================`);
    console.log(` Logged in as: ${client.user.tag}`);
    console.log(` ID: ${client.user.id}`);
    console.log(` Servers: ${client.guilds.cache.size}`);
    console.log(` Target Guild: ${config.guildId}`);
    console.log(`=========================================`);

    // Set bot presence / activity
    client.user.setPresence({
      activities: [
        {
          name: '/help | Protecting Server',
          type: ActivityType.Custom
        }
      ],
      status: 'online'
    });

    // Automatically configure channel slowmodes across the server
    try {
      for (const guild of client.guilds.cache.values()) {
        const channels = await guild.channels.fetch().catch(() => null);
        if (!channels) continue;

        const everyoneRole = guild.roles.everyone;

        const generalCategory = channels.find(c => c && c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('general'));
        let picRatingChannel = channels.find(c => c && c.name.toLowerCase().includes('pic-rating'));
        let submitChannel = channels.find(c => c && (c.name.toLowerCase().includes('photo-submit') || c.name.toLowerCase().includes('submit-photo')));

        if (!submitChannel) {
          submitChannel = await guild.channels.create({
            name: '📤ㆍphoto-submit',
            type: ChannelType.GuildText,
            parent: generalCategory ? generalCategory.id : null,
            position: picRatingChannel ? Math.max(0, picRatingChannel.position) : 1,
            rateLimitPerUser: 900,
            topic: 'Submit your planespotting & aviation photos here! Approved photos are published to #pic-rating.',
            reason: 'Auto-creation of photo submission channel'
          }).catch(err => {
            console.error('Failed to create photo-submit channel:', err);
            return null;
          });
          if (submitChannel) {
            console.log(`📤 Created photo submission channel #${submitChannel.name} in ${guild.name}`);
          }
        } else if (submitChannel.rateLimitPerUser !== 900) {
          await submitChannel.setRateLimitPerUser(900, '15-minute slowmode for photo submissions').catch(() => {});
        }

        if (picRatingChannel && picRatingChannel.rateLimitPerUser !== 0) {
          await picRatingChannel.setRateLimitPerUser(0, 'Reset slowmode on read-only rating channel').catch(() => {});
        }

        for (const [, channel] of channels) {
          if (!channel || channel.type !== ChannelType.GuildText) continue;

          // 1. #photo-submit gets 15-minute slowmode (900 seconds)
          if (channel.name.toLowerCase().includes('photo-submit') || channel.name.toLowerCase().includes('submit-photo')) {
            if (channel.rateLimitPerUser !== 900) {
              await channel.setRateLimitPerUser(900, '15-minute slowmode for photo submissions').catch(() => {});
            }
            continue;
          }

          // 2. Check if channel is read-only (rules, news, welcome, roles, photo-leaderboard, pic-rating, appeal-hub, etc.)
          const overwrites = channel.permissionOverwrites.cache.get(everyoneRole.id);
          const isEveryoneDenied = overwrites && overwrites.deny.has(PermissionFlagsBits.SendMessages);
          const isReadOnlyName = /news|rules|welcome|roles|leaderboard|pic-rating|appeal-hub|staff-news/i.test(channel.name);

          if (isEveryoneDenied || isReadOnlyName) {
            // Read-only channel, leave slowmode at 0
            if (channel.rateLimitPerUser !== 0) {
              await channel.setRateLimitPerUser(0).catch(() => {});
            }
            continue;
          }

          // 3. Open chat channels get 3-second slowmode
          if (channel.rateLimitPerUser !== 3) {
            await channel.setRateLimitPerUser(3, '3-second chat slowmode to prevent spam').catch(() => {});
            console.log(`⏱️ Configured 3s slowmode on #${channel.name} in ${guild.name}`);
          }
        }

        // 4. Ensure Anti-Bot Verification Channel & Panel
        const verificationService = require('../services/verificationService');
        await verificationService.ensureVerificationPanel(guild).catch(() => {});

        // 5. Ensure Role Picker Panels in #🎨ㆍroles
        const rolePickerService = require('../services/rolePickerService');
        await rolePickerService.publishRolePicker(guild).catch(() => {});

        // 5.5 Ensure Components V2 Rules Panel in #📜ㆍrules
        const rulesService = require('../services/rulesService');
        await rulesService.ensureRulesPanel(guild).catch(() => {});

        // 6. Log Bot Ready to Staff/Admin Log Channel
        const adminLogService = require('../services/adminLogService');
        await adminLogService.logBotReady(guild, client).catch(() => {});

        // 7. Ensure 👑ㆍOwner role exists and is positioned right below the bot role
        let ownerRole = guild.roles.cache.find(r => r.name === '👑ㆍOwner' || r.name.toLowerCase() === 'owner');
        if (!ownerRole) {
          ownerRole = await guild.roles.create({
            name: '👑ㆍOwner',
            color: 0xE74C3C,
            hoist: true,
            permissions: [PermissionFlagsBits.Administrator],
            reason: 'Auto-creation of server Owner role'
          }).catch(() => null);
          console.log(`👑 Created 👑ㆍOwner role in ${guild.name} (unassigned)`);
        }

        if (ownerRole) {
          const botHighestRole = guild.members.me?.roles.highest;
          if (botHighestRole && botHighestRole.position > 1) {
            const targetPosition = botHighestRole.position - 1;
            if (ownerRole.position < targetPosition) {
              await ownerRole.setPosition(targetPosition, { reason: 'Position Owner role directly below bot role' }).catch(err => {
                console.warn('Could not set Owner role position:', err.message);
              });
              console.log(`👑 Positioned 👑ㆍOwner role at hierarchy position ${targetPosition} (below @${botHighestRole.name})`);
            }
          }
        }

        // 8. Ensure 🧪ㆍTester role exists (Slowmode immune)
        let testerRole = guild.roles.cache.find(r => r.name === '🧪ㆍTester' || r.name.toLowerCase() === 'tester');
        if (!testerRole) {
          testerRole = await guild.roles.create({
            name: '🧪ㆍTester',
            color: 0x1ABC9C,
            hoist: false,
            permissions: [PermissionFlagsBits.ManageMessages],
            reason: 'Auto-creation of Tester role (Slowmode immunity)'
          }).catch(() => null);
          console.log(`🧪 Created 🧪ㆍTester role in ${guild.name} (Slowmode immune)`);
        }

        // 9. Sync 💎ㆍOG Member role for the first 100 human members
        const ogRoleService = require('../services/ogRoleService');
        await ogRoleService.syncOGRolesForGuild(guild).catch(() => {});

        // 10. Ensure Automated Security Honeypot Channel (#do-not-type)
        const honeypotService = require('../services/honeypotService');
        await honeypotService.ensureHoneypotChannel(guild).catch(() => {});

        // 11. Ensure ⭐ㆍVIP role exists
        let vipRole = guild.roles.cache.find(r => r.name === '⭐ㆍVIP' || r.name.toLowerCase() === 'vip');
        if (!vipRole) {
          vipRole = await guild.roles.create({
            name: '⭐ㆍVIP',
            color: 0xF1C40F,
            hoist: true,
            permissions: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AddReactions,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.UseExternalEmojis,
              PermissionFlagsBits.UseExternalStickers,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak,
              PermissionFlagsBits.PrioritySpeaker
            ],
            reason: 'Auto-creation of VIP prestige role'
          }).catch(() => null);
          console.log(`⭐ Created ⭐ㆍVIP role in ${guild.name}`);
        }

        if (vipRole) {
          const ogRole = guild.roles.cache.find(r => r.name.toLowerCase().includes('og member'));
          if (ogRole && vipRole.position <= ogRole.position) {
            const targetPos = ogRole.position + 1;
            await vipRole.setPosition(targetPos, { reason: 'Position VIP role directly above OG Member role' }).catch(err => {
              console.warn('Could not set VIP role position:', err.message);
            });
            console.log(`⭐ Positioned ⭐ㆍVIP role at hierarchy position ${targetPos} (directly above @${ogRole.name})`);
          }
        }

        // 12. Ensure VIP Lounge Category & VIP General Chat
        const vipLoungeService = require('../services/vipLoungeService');
        await vipLoungeService.ensureVipCategoryAndChannels(guild).catch(() => {});

        // 13. Ensure Events Channel
        const eventService = require('../services/eventService');
        await eventService.getOrCreateEventsChannel(guild).catch(() => {});
      }
    } catch (err) {
      console.error('Error applying channel configurations on ready:', err.message);
    }
  }
};

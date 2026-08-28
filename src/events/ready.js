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

        for (const [, channel] of channels) {
          if (!channel || channel.type !== ChannelType.GuildText) continue;

          // 1. #pic-rating gets 15-minute slowmode (900 seconds)
          if (channel.id === '1524791955111018526' || channel.name.toLowerCase().includes('pic-rating')) {
            if (channel.rateLimitPerUser !== 900) {
              await channel.setRateLimitPerUser(900, '15-minute slowmode for photo submissions').catch(() => {});
              console.log(`⏱️ Configured 15m slowmode on #${channel.name} in ${guild.name}`);
            }
            continue;
          }

          // 2. Check if channel is read-only (rules, news, welcome, roles, photo-leaderboard, appeal-hub, etc.)
          const overwrites = channel.permissionOverwrites.cache.get(everyoneRole.id);
          const isEveryoneDenied = overwrites && overwrites.deny.has(PermissionFlagsBits.SendMessages);
          const isReadOnlyName = /news|rules|welcome|roles|leaderboard|appeal-hub|staff-news/i.test(channel.name);

          if (isEveryoneDenied || isReadOnlyName) {
            // Read-only channel, leave slowmode at 0
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
      }
    } catch (err) {
      console.error('Error applying channel configurations on ready:', err.message);
    }
  }
};

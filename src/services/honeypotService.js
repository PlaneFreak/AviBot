const { ChannelType, PermissionFlagsBits } = require('discord.js');
const suspensionManager = require('../utils/suspensionManager');
const adminLogService = require('./adminLogService');
const componentsV2 = require('../utils/componentsV2');
const db = require('../database/db');

const HONEYPOT_CHANNEL_NAME = '⚠️ㆍdo-not-type';

function buildHoneypotV2Container(guild) {
  const banCount = db.getHoneypotTriggerCount ? db.getHoneypotTriggerCount(guild.id) : 0;

  return componentsV2.createContainer({
    components: [
      componentsV2.createSection({
        text: '# DO NOT SEND MESSAGES IN THIS CHANNEL\n\nThis channel is used to catch spam bots. Any messages sent here will result in **an immediate ban**.',
        accessory: componentsV2.createThumbnail('https://images.emojiterra.com/google/noto-color-emoji/v16.0/512px/1f36f.png')
      }),
      componentsV2.createActionRow([
        componentsV2.createButton({
          customId: 'honeypot_bans_counter',
          label: `Bans: ${banCount}`,
          emoji: '🍯',
          style: 2,
          disabled: true
        })
      ])
    ]
  });
}

module.exports = {
  HONEYPOT_CHANNEL_NAME,

  /**
   * Finds or creates the Honeypot trap channel and publishes the Components V2 container
   */
  async ensureHoneypotChannel(guild) {
    try {
      const channels = await guild.channels.fetch();
      let channel = channels.find(
        c => c && c.type === ChannelType.GuildText && (c.name === HONEYPOT_CHANNEL_NAME || c.name.toLowerCase().includes('do-not-type'))
      );

      const verifiedRole = guild.roles.cache.find(r => r.name.toLowerCase().includes('verified'));
      const everyoneRole = guild.roles.everyone;

      // Find Important category
      const category = channels.find(
        c => c && c.type === ChannelType.GuildCategory && (c.name.toLowerCase().includes('important') || c.id === '1524792072924696837')
      );

      const overwrites = [
        {
          id: everyoneRole.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.SendMessages
          ],
          deny: [
            PermissionFlagsBits.AddReactions,
            PermissionFlagsBits.CreatePublicThreads,
            PermissionFlagsBits.CreatePrivateThreads
          ]
        }
      ];

      if (verifiedRole) {
        overwrites.push({
          id: verifiedRole.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.SendMessages
          ],
          deny: [
            PermissionFlagsBits.AddReactions,
            PermissionFlagsBits.CreatePublicThreads,
            PermissionFlagsBits.CreatePrivateThreads
          ]
        });
      }

      if (!channel) {
        channel = await guild.channels.create({
          name: HONEYPOT_CHANNEL_NAME,
          type: ChannelType.GuildText,
          parent: category ? category.id : null,
          position: 1,
          topic: '⛔ RESTRICTED AUTOMATED SECURITY CHANNEL • DO NOT SEND MESSAGES. ANY MESSAGE TRIGGERS AN INSTANT BAN.',
          permissionOverwrites: overwrites,
          reason: 'Auto-creation of Security Honeypot Channel'
        });
        console.log(`🪤 Created Honeypot trap channel #${channel.name} in ${guild.name} (Important category)`);
      } else {
        // Move to Important category and position near top if not already there
        if (category && (channel.parentId !== category.id || channel.position > 2)) {
          await channel.setParent(category.id, { lockPermissions: false }).catch(() => {});
          await channel.setPosition(1).catch(() => {});
          console.log(`🪤 Repositioned #${channel.name} to top of ${category.name}`);
        }

        // Ensure permissions allow typing so the trap functions
        await channel.permissionOverwrites.edit(everyoneRole, {
          ViewChannel: true,
          ReadMessageHistory: true,
          SendMessages: true
        }).catch(() => {});

        if (verifiedRole) {
          await channel.permissionOverwrites.edit(verifiedRole, {
            ViewChannel: true,
            ReadMessageHistory: true,
            SendMessages: true
          }).catch(() => {});
        }
      }

      // Check existing messages in channel and post fresh Components V2 container if needed
      const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
      let needsPost = true;

      if (messages && messages.size > 0) {
        for (const [, msg] of messages) {
          if (msg.author.id === guild.client.user.id) {
            // If it's old embed format or we need a clean V2 post, purge it
            if (msg.flags.has(32768)) {
              needsPost = false; // Already active V2 message
            } else {
              await msg.delete().catch(() => {});
            }
          }
        }
      }

      if (needsPost) {
        const container = buildHoneypotV2Container(guild);
        await componentsV2.sendToChannel(guild.client, channel.id, [container]).catch(err => {
          console.error('Failed to send Components V2 honeypot message:', err);
        });
      }

      return channel;
    } catch (err) {
      console.error('Error ensuring Honeypot channel:', err);
      return null;
    }
  },

  /**
   * Intercepts messages in the honeypot channel
   */
  async handleMessage(message) {
    if (!message.guild) return false;

    const channel = message.channel;
    const isHoneypot = channel.name === HONEYPOT_CHANNEL_NAME || channel.name.toLowerCase().includes('do-not-type');
    if (!isHoneypot) return false;

    // Delete all messages immediately
    await message.delete().catch(() => {});

    // Ignore bots
    if (message.author.bot) return true;

    // Staff bypass: Admins who type are just cleaned up without punishment
    if (message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      return true;
    }

    const member = message.member;
    const guild = message.guild;

    console.log(`🪤 [HONEYPOT TRIGGERED] User ${message.author.tag} (${message.author.id}) typed in #${channel.name}. Initiating 5-day jail & ban sequence...`);

    // 1. Instant 5-Day Quarantine Jail & Ban
    try {
      await suspensionManager.quarantineMember(
        member,
        'jail',
        'Triggered Automated Security Honeypot (#do-not-type)',
        guild.client.user
      );
    } catch (jailErr) {
      console.error('Failed to quarantine user for honeypot violation:', jailErr);
    }

    // 2. High-Priority Alert to Admin Logs
    const adminChannel = await adminLogService.getOrCreateAdminLogChannel(guild);
    if (adminChannel) {
      const alertContainer = componentsV2.createContainer({
        accentColor: 0xE74C3C,
        components: [
          componentsV2.createSection({
            text:
              `# 🚨 HONEYPOT TRAP TRIGGERED\n\n` +
              `**Offender:** ${message.author} (\`${message.author.tag}\` • \`${message.author.id}\`)\n` +
              `**Action Taken:** Instant Server Quarantine & Jailing (Write Access Revoked)\n` +
              `**Schedule:** ⏰ **Permanent Ban in 5 Days** (unless pardoned by staff)\n` +
              `**Location:** #${channel.name}\n` +
              `**Message Content:** \`\`\`${message.content.slice(0, 500) || '[Attachment/Empty]'}\`\`\``,
            accessory: componentsV2.createThumbnail('https://images.emojiterra.com/google/noto-color-emoji/v16.0/512px/1f6a8.png')
          })
        ]
      });

      await componentsV2.sendToChannel(guild.client, adminChannel.id, [alertContainer]).catch(() => {});
    }

    // 3. Post fresh Components V2 container with updated counter in channel (deleting previous bot message first)
    try {
      const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
      if (messages) {
        for (const [, msg] of messages) {
          if (msg.author.id === guild.client.user.id) {
            await msg.delete().catch(() => {});
          }
        }
      }
      const container = buildHoneypotV2Container(guild);
      await componentsV2.sendToChannel(guild.client, channel.id, [container]).catch(() => {});
    } catch (refreshErr) {
      console.error('Error refreshing honeypot message:', refreshErr);
    }

    // 4. Send DM to the user
    await message.author.send({
      content:
        `🚨 **Security Violation in ${guild.name}**\n\n` +
        `You were placed in **Quarantine Jail** because you sent a message in the restricted honeypot channel **#do-not-type**.\n` +
        `• All roles and server write permissions have been revoked.\n` +
        `• You will be **permanently banned in 5 days** unless you submit a successful appeal in your jail channel or via DM.`
    }).catch(() => {});

    return true;
  }
};

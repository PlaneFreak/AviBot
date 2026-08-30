const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const stickyManager = require('../data/stickyManager');
const config = require('../config');

// Helper to format sticky message as plain text header
function formatStickyMessage(content) {
  return `# 📌 Pinned Message\n${content}`;
}

// In-memory locks to prevent multiple concurrent sticky re-posts
const stickyLocks = new Set();

// In-memory rate limiter for Chat XP (60-second cooldown per user)
const chatXpCooldowns = new Map();

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    // Ignore all messages sent by bots (prevents duplicate self-triggers)
    if (message.author.bot) return;

    // ----------------------------------------------------
    // 0. Handle DM Messages (Appeals via Direct Message text reply)
    // ----------------------------------------------------
    if (!message.guild) {

      const appealHelper = require('../utils/appealHelper');
      const punishmentTracker = require('../data/punishmentTracker');
      const punishment = punishmentTracker.getLatestPunishment(message.author.id);

      const targetGuildId = punishment ? punishment.guildId : config.guildId;
      const punishmentType = punishment ? punishment.type : 'punishment';
      const originalReason = punishment ? punishment.reason : 'Not specified';
      const originalMod = punishment ? punishment.moderatorTag : 'Staff Team';

      const guild = await client.guilds.fetch(targetGuildId).catch(() => null);
      if (!guild) {
        return message.reply({
          content: `${config.emojis.error} Could not locate the server to deliver your appeal.`
        });
      }

      try {
        const appealsChannel = await appealHelper.getOrCreateAppealsChannel(guild);
        if (!appealsChannel) {
          return message.reply({
            content: `${config.emojis.error} Could not route appeal to the server staff channel.`
          });
        }

        const appealEmbed = new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle(`⚖️ Punishment Appeal • ${punishmentType.toUpperCase()} (Via DM Reply)`)
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
          .addFields(
            {
              name: '👤 User',
              value: `${message.author.tag} (${message.author})\n\`${message.author.id}\``,
              inline: true
            },
            {
              name: '🔨 Punishment',
              value: `\`${punishmentType.toUpperCase()}\``,
              inline: true
            },
            {
              name: '🛡️ Punished By',
              value: originalMod,
              inline: true
            },
            {
              name: '⚠️ Original Reason',
              value: originalReason,
              inline: false
            },
            {
              name: '📝 Appeal Message',
              value: message.content.slice(0, 1000) || '*[Attached media or empty]*',
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

        const staffRow = appealHelper.createAppealStaffRow(targetGuildId, message.author.id, punishmentType);
        await appealsChannel.send({ embeds: [appealEmbed], components: [staffRow] });

        const confirmDm = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('✅ Appeal Delivered to Staff')
          .setDescription(`Your appeal for **${guild.name}** has been received and forwarded to the server staff in **#${appealsChannel.name}**.\n\nYou will be notified here via DM when a moderator reviews your appeal.`)
          .setFooter({ text: config.footerText })
          .setTimestamp();

        await message.reply({ embeds: [confirmDm] });
        return;
      } catch (err) {
        console.error('Error handling DM appeal:', err);
        return message.reply({
          content: `${config.emojis.error} Failed to submit your appeal: ${err.message}`
        });
      }
    }

    const channel = message.channel;
    const content = message.content.trim();

    // ----------------------------------------------------
    // 0.1 Security Honeypot Check (Instant 5-Day Jail & Ban Sequence)
    // ----------------------------------------------------
    const honeypotService = require('../services/honeypotService');
    const isHoneypot = await honeypotService.handleMessage(message);
    if (isHoneypot) return;

    // ----------------------------------------------------
    // Fun Feature: 10-minute Photo Troll Responder
    // ----------------------------------------------------
    const trollTracker = require('../data/trollTracker');

    // ----------------------------------------------------
    // Anti-Spam Security Check (Deletes flood/duplicate/invite spam & auto-timeouts)
    // ----------------------------------------------------
    const antiSpamService = require('../services/antiSpamService');
    const isSpam = await antiSpamService.handleMessage(message);
    // Check for ?addxp command (?addxp @user <amount> [spotter|chat])
    if (content.toLowerCase().startsWith('?addxp')) {
      if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply({ content: '❌ You need **Moderator** or **Administrator** permissions to add XP.' })
          .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
      }

      const args = content.split(/\s+/).slice(1);
      const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null) : null);

      if (!target) {
        return message.reply({ content: '⚠️ **Usage:** `?addxp @user <amount> [spotter|chat]`' })
          .then(msg => setTimeout(() => msg.delete().catch(() => {}), 6000));
      }

      const rawAmount = args.find((a, i) => i > 0 && /^\d+$/.test(a)) || args[1];
      const amount = parseInt(rawAmount, 10);

      if (!amount || isNaN(amount) || amount <= 0) {
        return message.reply({ content: '❌ Please specify a valid XP amount greater than 0: `?addxp @user 500`' })
          .then(msg => setTimeout(() => msg.delete().catch(() => {}), 6000));
      }

      const isChatType = args.some(a => a.toLowerCase() === 'chat');
      const db = require('../database/db');
      const levelHelper = require('../utils/levelHelper');
      const componentsV2 = require('../utils/componentsV2');

      let totalXP = 0;
      let newLevel = 1;
      let rankTitle = '';
      let progressBar = '';
      let categoryName = '';

      if (isChatType) {
        const result = db.addChatXP(target.id, message.guild.id, amount);
        totalXP = result.totalChatXP;
        newLevel = result.newLevel;
        rankTitle = result.levelData.rankTitle;
        progressBar = result.levelData.progressBar;
        categoryName = '💬 Chat Activity XP';
      } else {
        const result = db.addXP(target.id, message.guild.id, amount);
        totalXP = result.totalXP;
        newLevel = result.newLevel;
        const levelData = levelHelper.calculateLevelData(totalXP);
        rankTitle = levelData.rankTitle;
        progressBar = levelData.progressBar;
        categoryName = '📸 Spotter XP';
      }

      const container = componentsV2.createContainer({
        accentColor: config.colors.primary,
        components: [
          componentsV2.createSection({
            text:
              `# ✨ XP Successfully Awarded\n\n` +
              `**Recipient:** ${target} (\`${target.tag}\`)\n` +
              `**Amount Added:** **+${amount.toLocaleString()} XP** (${categoryName})\n` +
              `**New Total XP:** **${totalXP.toLocaleString()} XP**\n` +
              `**Current Level:** **Level ${newLevel}** — *${rankTitle}*\n` +
              `**Progress:** \`${progressBar}\`\n\n` +
              `*Awarded by ${message.author}*`,
            accessory: target.displayAvatarURL ? componentsV2.createThumbnail(target.displayAvatarURL({ dynamic: true })) : null
          })
        ]
      });

      await componentsV2.sendToChannel(client, channel.id, [container]);
      return;
    }

    // Check for ?event command (Interactive Event Creation Wizard)
    if (content.toLowerCase().startsWith('?event')) {
      const eventService = require('../services/eventService');
      await eventService.handleEventWizard(message);
      return;
    }

    // Check for ?troll command (Fun Photo Responder)
    if (content.toLowerCase().startsWith('?troll') || content.toLowerCase().startsWith('?untroll')) {
      if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return;
      }

      const target = message.mentions.users.first();
      if (!target) {
        return message.reply({ content: '⚠️ Please mention a user: `?troll @user` or `?troll stop @user`' })
          .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
      }

      if (content.toLowerCase().includes('stop') || content.toLowerCase().startsWith('?untroll')) {
        trollTracker.removeTroll(target.id);
        return message.reply({ content: `🛑 Fun photo responder stopped for **${target.tag}**.` })
          .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
      }

      const expiresAt = trollTracker.addTroll(target.id, 10 * 60 * 1000);
      const expiresAtSeconds = Math.floor(expiresAt / 1000);

      return message.reply({
        content: `🎉 Activated! For the next **10 minutes** (<t:${expiresAtSeconds}:R>), every picture/image sent by **${target.tag}** will receive a funny aviation comment! (Stop with \`?troll stop @user\`)`
      });
    }

    // ----------------------------------------------------
    // Photo Submission & Rating System
    // Submissions are posted in #📤ㆍphoto-submit (15m slowmode)
    // Rating voting cards are published to #📷ㆍpic-rating (read-only)
    // ----------------------------------------------------
    const isPhotoSubmitChannel = channel.name.toLowerCase().includes('photo-submit') || channel.name.toLowerCase().includes('submit-photo');
    const isPicRatingChannel = channel.name.toLowerCase().includes('pic-rating');

    // 1. If someone tries to chat in #pic-rating (which is bot-only)
    if (isPicRatingChannel && !message.author.bot) {
      if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.delete().catch(() => {});
        const allChans = await message.guild.channels.fetch();
        const submitCh = allChans.find(c => c && (c.name.toLowerCase().includes('photo-submit') || c.name.toLowerCase().includes('submit-photo')));
        const notice = await channel.send({
          content: `ℹ️ ${message.author}, chatting is disabled in #${channel.name}. Please upload photos in ${submitCh || '#photo-submit'} and vote using the rating buttons below photos!`
        });
        setTimeout(() => notice.delete().catch(() => {}), 6000);
        return;
      }
    }

    // 2. Photo Submission in #photo-submit
    if (isPhotoSubmitChannel) {
      const imageAttachment = message.attachments.find(att =>
        (att.contentType && att.contentType.startsWith('image/')) ||
        /\.(png|jpe?g|webp|gif)$/i.test(att.name)
      );

      const urlMatch = message.content.match(/https?:\/\/\S+\.(png|jpe?g|webp|gif)/i);
      const targetImageUrl = imageAttachment ? imageAttachment.url : (urlMatch ? urlMatch[0] : null);

      // If user sent a message WITHOUT an image, delete it
      if (!targetImageUrl) {
        await message.delete().catch(() => {});
        const warnMsg = await channel.send({
          content: `⚠️ ${message.author}, only **aviation photos** can be submitted in #${channel.name}. Text messages without pictures are automatically removed.`
        });
        setTimeout(() => warnMsg.delete().catch(() => {}), 6000);
        return;
      }

      const photoRatingHelper = require('../utils/photoRatingHelper');
      const db = require('../database/db');
      const geminiService = require('../services/geminiService');
      const componentsV2 = require('../utils/componentsV2');

      // Add temporary clock reaction
      await message.react('⏳').catch(() => {});

      // Extract any user caption
      let caption = message.content;
      if (urlMatch) {
        caption = caption.replace(urlMatch[0], '').trim();
      }

      // ----------------------------------------------------
      // Gemini Vision AI: Aviation Content Check
      // ----------------------------------------------------
      try {
        const isAviation = await geminiService.isAviationImage(
          targetImageUrl,
          imageAttachment ? imageAttachment.contentType : 'image/jpeg'
        );

        if (!isAviation) {
          console.log(`🚫 [Gemini Filter] Image by ${message.author.tag} in #${channel.name} was rejected as non-aviation.`);
          await message.reactions.removeAll().catch(() => {});
          await message.react('❌').catch(() => {});

          const rejMsg = await channel.send({
            content: `🚫 ${message.author}, your submission was removed because Gemini AI did not detect any **aviation content** (aircraft, cockpits, runways, airports, or plane spotting). Please only post aviation pictures!`
          });
          setTimeout(async () => {
            await rejMsg.delete().catch(() => {});
            await message.delete().catch(() => {});
          }, 8000);
          return;
        }

        // Gemini approved: Mark with green checkmark
        await message.reactions.removeAll().catch(() => {});
        await message.react('✅').catch(() => {});

        // Find #pic-rating channel
        const guildChannels = await message.guild.channels.fetch();
        const picRatingTarget = guildChannels.find(
          c => c && c.type === ChannelType.GuildText && c.name.toLowerCase().includes('pic-rating')
        );

        if (!picRatingTarget) {
          return message.reply({ content: '❌ Target rating channel `#pic-rating` could not be found.' });
        }

        // Build Components V2 Rating Container for #pic-rating
        const ratingContainer = photoRatingHelper.createPhotoContainer(
          message.author,
          targetImageUrl,
          caption,
          { totalPoints: 0, voteCount: 0, averageRating: '0.0' },
          false,
          null,
          message.url
        );

        const cardMessage = await componentsV2.sendToChannel(
          client,
          picRatingTarget.id,
          [ratingContainer]
        );

        // Save in SQLite DB
        db.createPhotoSubmission({
          messageId: cardMessage.id,
          channelId: picRatingTarget.id,
          userId: message.author.id,
          guildId: message.guild.id,
          imageUrl: targetImageUrl,
          caption: caption
        });

        // Confirmation in #photo-submit
        const confirmNotice = await channel.send({
          content: `✅ ${message.author}, your spotter photo was approved by Gemini AI and published to ${picRatingTarget} for community rating!`
        });
        setTimeout(() => confirmNotice.delete().catch(() => {}), 8000);
      } catch (err) {
        console.error('Error screening or publishing photo submission:', err);
      }

      return;
    }

    // Check if author is currently being trolled and posted an image
    if (trollTracker.isTrolled(message.author.id)) {
      const imageAttachment = message.attachments.find(att =>
        (att.contentType && att.contentType.startsWith('image/')) ||
        /\.(png|jpe?g|webp|gif)$/i.test(att.name)
      );

      const urlMatch = message.content.match(/https?:\/\/\S+\.(png|jpe?g|webp|gif)/i);
      const targetImageUrl = imageAttachment ? imageAttachment.url : (urlMatch ? urlMatch[0] : null);

      if (targetImageUrl) {
        const geminiService = require('../services/geminiService');
        // 1. Try AI-powered identification & roast
        const aiComment = await geminiService.generateImageTrollComment(
          targetImageUrl,
          imageAttachment ? imageAttachment.contentType : 'image/jpeg'
        );

        // 2. Fallback to random anti-repeat comment if AI is not available
        const finalComment = aiComment || trollTracker.getRandomComment(message.author.id);
        await message.reply({ content: finalComment }).catch(() => {});
      }
    }

    // ----------------------------------------------------
    // 1. Handle ?stick command
    // ----------------------------------------------------
    if (content.toLowerCase() === '?stick' || content.toLowerCase().startsWith('?stick ')) {
      // Permission check
      if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply({
          content: `${config.emojis.error} You need **Manage Messages** or **Administrator** permissions to use \`?stick\`.`
        }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
      }

      // Check bot permissions
      if (!channel.permissionsFor(guildMe(message.guild, client)).has(PermissionFlagsBits.ManageChannels)) {
        return message.reply({
          content: `${config.emojis.error} I need **Manage Channels** permission to temporarily lock this channel for setup.`
        });
      }

      // Save previous @everyone SendMessages permission
      const everyoneRole = message.guild.roles.everyone;
      const currentOverwrites = channel.permissionOverwrites.cache.get(everyoneRole.id);
      const originalSendMessages = currentOverwrites ? currentOverwrites.deny.has(PermissionFlagsBits.SendMessages) ? false : (currentOverwrites.allow.has(PermissionFlagsBits.SendMessages) ? true : null) : null;

      try {
        // Lock channel for @everyone (admins and staff with explicit roles can still speak)
        await channel.permissionOverwrites.edit(everyoneRole, {
          SendMessages: false
        }, { reason: 'Temporary channel lock for ?stick setup by ' + message.author.tag });

        // Delete user's ?stick trigger message
        await message.delete().catch(() => {});

        const promptEmbed = new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle('🔒 Channel Locked • Sticky Message Setup')
          .setDescription(
            `Hello ${message.author}! This channel has been temporarily locked so you can set up a sticky message.\n\n` +
            '**Please type the message you would like to stick below.**\n' +
            '*(Type `cancel` within 2 minutes to abort and unlock the channel)*'
          )
          .setFooter({ text: config.footerText });

        const promptMsg = await channel.send({ embeds: [promptEmbed] });

        // Await next message from author
        const filter = m => m.author.id === message.author.id;
        const collected = await channel.awaitMessages({ filter, max: 1, time: 120000 });

        // Always unlock channel when done
        await channel.permissionOverwrites.edit(everyoneRole, {
          SendMessages: originalSendMessages
        }, { reason: 'Restoring channel permissions after ?stick setup' }).catch(() => {});

        if (!collected || collected.size === 0) {
          await promptMsg.delete().catch(() => {});
          const timeoutNotice = await channel.send({
            content: `⏱️ ${message.author}, sticky message setup timed out. The channel has been unlocked.`
          });
          return setTimeout(() => timeoutNotice.delete().catch(() => {}), 6000);
        }

        const userResponse = collected.first();
        const stickyContent = userResponse.content.trim();

        // Delete prompt and user's response message to keep channel tidy
        await promptMsg.delete().catch(() => {});
        await userResponse.delete().catch(() => {});

        if (stickyContent.toLowerCase() === 'cancel') {
          const cancelNotice = await channel.send({
            content: `✖️ ${message.author}, sticky message setup cancelled. The channel has been unlocked.`
          });
          return setTimeout(() => cancelNotice.delete().catch(() => {}), 5000);
        }

        // Delete existing sticky if there is one
        const existingSticky = stickyManager.getSticky(channel.id);
        if (existingSticky && existingSticky.lastMessageId) {
          const oldMsg = await channel.messages.fetch(existingSticky.lastMessageId).catch(() => null);
          if (oldMsg) await oldMsg.delete().catch(() => {});
        }

        // Send the new sticky message
        const stickyText = formatStickyMessage(stickyContent);
        const sentSticky = await channel.send({ content: stickyText });

        // Save to sticky manager
        stickyManager.setSticky(channel.id, {
          content: stickyContent,
          lastMessageId: sentSticky.id,
          authorId: message.author.id
        });

        const successNotice = await channel.send({
          content: `✅ Sticky message successfully set by ${message.author}! (Type \`?unstick\` or \`/unstick\` to remove)`
        });
        setTimeout(() => successNotice.delete().catch(() => {}), 5000);
        return;
      } catch (err) {
        console.error('Error during ?stick execution:', err);
        // Ensure channel is restored
        await channel.permissionOverwrites.edit(everyoneRole, {
          SendMessages: originalSendMessages
        }).catch(() => {});
        return channel.send({
          content: `❌ An error occurred during sticky setup: ${err.message}`
        });
      }
    }

    // ----------------------------------------------------
    // 2. Handle ?unstick command
    // ----------------------------------------------------
    if (content.toLowerCase() === '?unstick') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply({
          content: `${config.emojis.error} You need **Manage Messages** or **Administrator** permissions to use \`?unstick\`.`
        }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
      }

      await message.delete().catch(() => {});

      const existingSticky = stickyManager.getSticky(channel.id);
      if (!existingSticky) {
        const notFound = await channel.send({
          content: `${config.emojis.warning} There is no active sticky message in this channel.`
        });
        return setTimeout(() => notFound.delete().catch(() => {}), 5000);
      }

      if (existingSticky.lastMessageId) {
        const oldMsg = await channel.messages.fetch(existingSticky.lastMessageId).catch(() => null);
        if (oldMsg) await oldMsg.delete().catch(() => {});
      }

      stickyManager.deleteSticky(channel.id);

      const unstickNotice = await channel.send({
        content: `🗑️ Sticky message removed from this channel by ${message.author}.`
      });
      return setTimeout(() => unstickNotice.delete().catch(() => {}), 5000);
    }

    // ----------------------------------------------------
    // 2.5 Handle ?chatstop command in Jail Channels
    // ----------------------------------------------------
    if (content.toLowerCase() === '?chatstop') {
      if (!channel.name.startsWith('jail-')) {
        return message.reply({
          content: `${config.emojis.error} The \`?chatstop\` command can only be used in a \`jail-XXXXX\` channel.`
        }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
      }

      if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply({
          content: `${config.emojis.error} You need **Moderate Members** or **Administrator** permissions to use \`?chatstop\`.`
        }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
      }

      await message.delete().catch(() => {});

      // Find user overwrite that is not a role
      const memberOverwrite = channel.permissionOverwrites.cache.find(
        ow => ow.type === 1 // 1 is Member (User) overwrite
      );

      if (memberOverwrite) {
        await channel.permissionOverwrites.edit(memberOverwrite.id, {
          SendMessages: false,
          AddReactions: false
        }, { reason: `Chat closed by ${message.author.tag}` });
      }

      const stopEmbed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('🔒 Chat Closed')
        .setDescription(
          `Chat access has been disabled by ${message.author}.\n` +
          `The quarantined user can no longer send messages in this channel.\n\n` +
          `*Click **Chat Activate** above to reopen communication if needed.*`
        )
        .setFooter({ text: config.footerText })
        .setTimestamp();

      return channel.send({ embeds: [stopEmbed] });
    }

    // ----------------------------------------------------
    // 3. Community / Chat Activity XP & Leveling Engine
    // (Medium-to-Hard scaling, 60s anti-spam cooldown, min 5 chars)
    // ----------------------------------------------------
    const isBotOrSystemChannel =
      channel.name.toLowerCase().includes('welcome') ||
      channel.name.toLowerCase().includes('verify') ||
      channel.name.toLowerCase().includes('rules') ||
      channel.name.toLowerCase().includes('news') ||
      channel.name.toLowerCase().includes('log') ||
      channel.name.toLowerCase().includes('appeal');

    if (!isPicRatingChannel && !isBotOrSystemChannel && content.length >= 5 && !content.startsWith('/') && !content.startsWith('!') && !content.startsWith('?')) {
      const now = Date.now();
      const lastXpTime = chatXpCooldowns.get(message.author.id) || 0;

      // 60-second cooldown between XP awards per user
      if (now - lastXpTime >= 60000) {
        chatXpCooldowns.set(message.author.id, now);

        const xpGained = Math.floor(Math.random() * 11) + 15; // 15 - 25 XP per valid message
        const db = require('../database/db');
        const xpResult = db.addChatXP(message.author.id, message.guild.id, xpGained);

        if (xpResult && xpResult.leveledUp) {
          const levelUpEmbed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setAuthor({
              name: `Level Up! 🎉`,
              iconURL: message.author.displayAvatarURL({ dynamic: true })
            })
            .setDescription(
              `Congratulations ${message.author}! You have reached **Chat Activity Level ${xpResult.newLevel}**!\n\n` +
              `🎖️ **Title:** **${xpResult.levelData.rankTitle}**\n` +
              `📊 **Progress:** \`${xpResult.levelData.progressBar}\``
            )
            .setFooter({ text: `${config.footerText} • Community Leveling` });

          channel.send({ embeds: [levelUpEmbed] }).catch(() => {});
        }
      }
    }

    // ----------------------------------------------------
    // 4. Handle Auto-Repin of Sticky Message on New Messages
    // ----------------------------------------------------
    const activeSticky = stickyManager.getSticky(channel.id);
    if (activeSticky && !stickyLocks.has(channel.id)) {
      stickyLocks.add(channel.id);

      setTimeout(async () => {
        try {
          // Delete previous sticky message
          if (activeSticky.lastMessageId) {
            const oldMsg = await channel.messages.fetch(activeSticky.lastMessageId).catch(() => null);
            if (oldMsg) await oldMsg.delete().catch(() => {});
          }

          // Send new sticky text at bottom
          const stickyText = formatStickyMessage(activeSticky.content);
          const newSticky = await channel.send({ content: stickyText });

          stickyManager.updateLastMessageId(channel.id, newSticky.id);
        } catch (error) {
          console.error('Failed to repost sticky message in', channel.id, error);
        } finally {
          stickyLocks.delete(channel.id);
        }
      }, 1500); // 1.5s debounce to let quick multiple messages land before re-posting
    }
  }
};

function guildMe(guild, client) {
  return guild.members.me || guild.members.cache.get(client.user.id);
}

const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const config = require('../config');

const EVENTS_CHANNEL_NAME = '🎉ㆍevents';

module.exports = {
  EVENTS_CHANNEL_NAME,

  /**
   * Finds or creates the dedicated #events channel
   */
  async getOrCreateEventsChannel(guild) {
    const channels = await guild.channels.fetch();
    let channel = channels.find(
      c => c && c.type === ChannelType.GuildText && (c.name === EVENTS_CHANNEL_NAME || c.name.toLowerCase().includes('event'))
    );

    if (channel) return channel;

    // Find Community / General or Important category
    const category = channels.find(
      c => c && c.type === ChannelType.GuildCategory && (c.name.toLowerCase().includes('general') || c.name.toLowerCase().includes('community') || c.name.toLowerCase().includes('important'))
    );

    const everyoneRole = guild.roles.everyone;
    const verifiedRole = guild.roles.cache.find(r => r.name.toLowerCase().includes('verified'));
    const modRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'moderator');
    const adminRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'admin');

    const overwrites = [
      {
        id: everyoneRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AddReactions],
        deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads]
      }
    ];

    if (verifiedRole) {
      overwrites.push({
        id: verifiedRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AddReactions],
        deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads]
      });
    }

    if (modRole) {
      overwrites.push({
        id: modRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      });
    }

    if (adminRole) {
      overwrites.push({
        id: adminRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      });
    }

    channel = await guild.channels.create({
      name: EVENTS_CHANNEL_NAME,
      type: ChannelType.GuildText,
      parent: category ? category.id : null,
      topic: 'Official community events, planespotting competitions, and aviation challenges.',
      permissionOverwrites: overwrites,
      reason: 'Auto-creation of Events Channel'
    });

    console.log(`🎉 Created Events channel #${channel.name} in ${guild.name}`);
    return channel;
  },

  /**
   * Interactive Step-by-Step Wizard for ?event create
   */
  async handleEventWizard(message) {
    const member = message.member;
    const channel = message.channel;
    const guild = message.guild;

    // Check staff permissions
    if (!member.permissions.has(PermissionFlagsBits.ModerateMembers) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const err = await message.reply({ content: '❌ You need **Moderator** or **Administrator** permissions to create an event.' });
      setTimeout(() => err.delete().catch(() => {}), 5000);
      return;
    }

    const filter = m => m.author.id === message.author.id;
    const wizardState = {
      title: '',
      description: '',
      reward: '',
      deadline: ''
    };

    // Helper to prompt user
    const askQuestion = async (promptText) => {
      const promptMsg = await channel.send({ content: promptText });
      try {
        const collected = await channel.awaitMessages({ filter, max: 1, time: 120000, errors: ['time'] });
        const userMsg = collected.first();
        const text = userMsg.content.trim();

        // Allow cancellation
        if (text.toLowerCase() === 'cancel' || text.toLowerCase() === 'abbrechen') {
          await channel.send({ content: '🛑 Event creation cancelled.' });
          return null;
        }

        return text;
      } catch (e) {
        await channel.send({ content: '⏰ Event creation timed out (2 minutes elapsed).' });
        return null;
      }
    };

    // --- STEP 1: Title ---
    const title = await askQuestion(
      `🎉 **Event Creation Wizard (Step 1/4)**\n` +
      `📌 **What is the title / name of the event?**\n` +
      `*(Example: \`Planespotting Summer Challenge 2026\` • Type \`cancel\` to abort)*`
    );
    if (!title) return;
    wizardState.title = title;

    // --- STEP 2: Description ---
    const description = await askQuestion(
      `📝 **Step 2/4: Event Description & Rules**\n` +
      `📖 **Please describe what this event is about, requirements, and how to participate:**\n` +
      `*(You can use multiple lines or formatting)*`
    );
    if (!description) return;
    wizardState.description = description;

    // --- STEP 3: Rewards ---
    const reward = await askQuestion(
      `🏆 **Step 3/4: Rewards & Prizes**\n` +
      `🎁 **What can participants or winners win?**\n` +
      `*(Example: \`⭐ VIP Role + 500 Spotter XP + Custom Role Color\`)*`
    );
    if (!reward) return;
    wizardState.reward = reward;

    // --- STEP 4: Deadline ---
    const deadline = await askQuestion(
      `⏰ **Step 4/4: Event Deadline / End Date**\n` +
      `📅 **Until when does this event run?**\n` +
      `*(Example: \`Sunday, 6. September 20:00 UTC\` or \`In 2 Weeks\`)*`
    );
    if (!deadline) return;
    wizardState.deadline = deadline;

    // --- FINISH: Publish to #events channel ---
    try {
      const eventsChannel = await this.getOrCreateEventsChannel(guild);
      const componentsV2 = require('../utils/componentsV2');

      const container = componentsV2.createContainer({
        accentColor: 0x9B59B6,
        components: [
          componentsV2.createSection({
            text:
              `# 🎉 NEW COMMUNITY EVENT: ${wizardState.title}\n\n` +
              `### 📖 Overview & Details\n${wizardState.description}\n\n` +
              `### 🏆 Prizes & Rewards\n${wizardState.reward}\n\n` +
              `### ⏰ Deadline / End Date\n**${wizardState.deadline}**\n\n` +
              `**Hosted By:** ${message.author} (\`${message.author.tag}\`)`,
            accessory: componentsV2.createThumbnail('https://cdn-icons-png.flaticon.com/512/3112/3112942.png')
          }),
          componentsV2.createActionRow([
            componentsV2.createButton({
              customId: 'event_join_toggle',
              label: "I'm Participating!",
              emoji: '🎉',
              style: 3 // Success green
            })
          ])
        ]
      });

      await eventsChannel.send({ content: `📢 @everyone **A new community event has started!**` }).catch(() => {});
      const eventMsg = await componentsV2.sendToChannel(guild.client, eventsChannel.id, [container]);

      await channel.send({
        content: `✅ **Event successfully published in ${eventsChannel}!**`
      });

      console.log(`🎉 Event "${wizardState.title}" published to #${eventsChannel.name} by ${message.author.tag} (Components V2)`);
    } catch (err) {
      console.error('Error publishing event:', err);
      await channel.send({ content: `❌ Error publishing event: ${err.message}` });
    }
  }
};

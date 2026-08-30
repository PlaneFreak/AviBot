const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');
const config = require('../../config');

function getHelpPage(page = 'home', client, guild) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setFooter({ text: `${config.footerText} • Use the dropdown below to navigate` })
    .setTimestamp();

  if (page === 'home') {
    const wsPing = client.ws.ping;
    const uptimeHours = Math.floor(process.uptime() / 3600);
    const uptimeMins = Math.floor((process.uptime() % 3600) / 60);

    embed
      .setTitle('✈️ AviBot Command Center & Aviation Guide')
      .setDescription(
        `Welcome to **AviBot** — the dedicated Discord automation and planespotting suite for **${guild.name}**!\n\n` +
        `Select a category from the dropdown menu below to view detailed command usages, permissions, and system explanations.`
      )
      .addFields(
        {
          name: '🚀 Quick Navigation',
          value:
            `📸 **Planespotting & Ratings** — AI Gemini vision, 1-10 voting & Spotter XP\n` +
            `✈️ **JetPhotos Verification** — 2-Factor ownership checks & Pro Spotter roles\n` +
            `💬 **Activity & Leveling** — Dual Chat XP curve, rankings & profiles\n` +
            `🛡️ **Anti-Spam & Anti-Raid** — 24/7 raid defense, invite quotas & flood filters\n` +
            `⚖️ **Staff Moderation** — Kicks, bans, timeouts, quarantine & appeals\n` +
            `⚙️ **Setup & Tools** — Server generator, sticky pins & channel inspectors`,
          inline: false
        },
        {
          name: '📊 System Status',
          value:
            `📶 **API Ping:** \`${wsPing}ms\`\n` +
            `⏱️ **Uptime:** \`${uptimeHours}h ${uptimeMins}m\`\n` +
            `🤖 **AI Engine:** \`Gemini 1.5/2.5 Vision (Active)\`\n` +
            `🥧 **Hosting:** \`Raspberry Pi 5 (24/7 Daemon)\``,
          inline: true
        },
        {
          name: '💎 Community Stats',
          value:
            `👥 **Members:** \`${guild.memberCount}\`\n` +
            `💬 **Channels:** \`${guild.channels.cache.size}\`\n` +
            `🛡️ **Roles:** \`${guild.roles.cache.size}\`\n` +
            `💎 **OG Limit:** \`First 100 Members\``,
          inline: true
        }
      );
  } else if (page === 'spotting') {
    embed
      .setTitle('📸 Planespotting Photo Engine & Leaderboards')
      .setDescription(
        'Upload your aircraft and planespotting photos directly in **`#pic-rating`** to earn points and climb the rankings!'
      )
      .addFields(
        {
          name: '🤖 Automated Gemini AI Check',
          value:
            'Every photo is analyzed in real-time. If no aircraft, airport, runway, cockpit, or spotting view is detected, the post is automatically removed to keep the feed high-quality.'
        },
        {
          name: '⭐ Interactive 1–10 Voting System',
          value:
            'Community members vote using the 1–10 buttons. Ratings 3–9 award `1–7` points. A **10/10** awards **`10 points`** (including `+2 bonus points`)! Anti-self-vote is strictly enforced.'
        },
        {
          name: '🏆 Photo Leaderboard Resets',
          value:
            'Leaderboards archive top photos across 5 recurring intervals: **Daily**, **3-Day**, **Weekly**, **Monthly**, and **Yearly** in `#photo-leaderboard`.'
        },
        {
          name: '📜 Related Commands',
          value:
            '`/top-spotters` — View the global planespotting points leaderboard\n' +
            '`/post-leaderboard [period]` — Manually publish a timeframe leaderboard `[Staff]`'
        }
      );
  } else if (page === 'jetphotos') {
    embed
      .setTitle('✈️ JetPhotos Verification & Spotter Roles')
      .setDescription(
        'Verify your real **JetPhotos** photographer account using automated AI vision verification!'
      )
      .addFields(
        {
          name: '🔍 How to Verify (`/jetphotos-verify`)',
          value:
            '1. Log into your account on [JetPhotos.com](https://www.jetphotos.com).\n' +
            '2. Take an **uncropped screenshot** of your dashboard where your **Acceptance Rate** and **full browser address bar (URL)** are visible.\n' +
            '3. Run `/jetphotos-verify screenshot:[image]`.'
        },
        {
          name: '🎖️ Role Rewards',
          value:
            '• **`🏆ㆍJP Pro Spotter`** — Requires **150+ accepted photos** (comes with a server celebration announcement!)\n' +
            '• **`✈️ㆍJP Spotter`** — Requires **1+ accepted photos**'
        },
        {
          name: '📜 Commands',
          value:
            '`/jetphotos-verify screenshot:<file>` — Submit dashboard screenshot for verification\n' +
            '`/jetphotos [user]` — View a member\'s verified JetPhotos stats and profile'
        }
      );
  } else if (page === 'leveling') {
    embed
      .setTitle('💬 Dual Leveling & Activity System')
      .setDescription(
        'AviBot features two completely independent progression tracks: **Chat Activity** and **Spotter Photo XP**.'
      )
      .addFields(
        {
          name: '💬 Chat Activity XP',
          value:
            '• Earn **15–25 XP** per message in public chat channels.\n' +
            '• **Anti-Spam Cooldown:** 60 seconds per user.\n' +
            '• **Progress Curve:** Medium to Hard (exponential XP curve to reward long-term activity).'
        },
        {
          name: '🏅 Chat Rank Titles',
          value:
            '`💬 Passenger` ➔ `🎫 Frequent Flyer` ➔ `🛫 Silver Aviator` ➔ `🌟 Gold Aviator` ➔ `💎 Diamond Aviator` ➔ `👑 Server Legend`'
        },
        {
          name: '📜 Commands',
          value:
            '`/rank [user]` — View your dual profile card (Chat Level + Spotter Stats + JetPhotos)\n' +
            '`/top-chatters` — View the server chat activity leaderboard\n' +
            '`/top-spotters` — View top planespotters by earned score'
        }
      );
  } else if (page === 'security') {
    embed
      .setTitle('🛡️ Anti-Spam & Anti-Raid Security Suite')
      .setDescription(
        'High-performance 24/7 server protection preventing raids, invite spam, and message flooding.'
      )
      .addFields(
        {
          name: '🚨 Anti-Raid Defense',
          value:
            '• **Join Flood Trigger:** >= 6 joins in 10s triggers **Emergency Server Lockdown**.\n' +
            '• **Action:** Closes `#verify`, quarantines fresh accounts (<24h), and pings staff in `#admin-logs`.'
        },
        {
          name: '⚡ Anti-Spam Limits',
          value:
            '• **Message Flood:** Max 5 messages in 4s (Auto-timeout 5m).\n' +
            '• **Duplicate Text:** Max 3 repeated messages (Auto-timeout 5m).\n' +
            '• **Mass Mention:** Max 4 mentions or unauthorized `@everyone`.\n' +
            '• **Discord Invites:** Blocked automatically unless granted via `/allowinvites`.'
        },
        {
          name: '📜 Commands',
          value:
            '`/antispam` — View active anti-spam filters\n' +
            '`/antiraid status` — View live raid monitoring metrics `[Admin]`\n' +
            '`/antiraid lockdown state:<enable/disable>` — Manual emergency lockdown toggle `[Admin]`\n' +
            '`/allowinvites user:<@user> amount:<1-100>` — Grant invite link quota for paid ads `[Mod]`'
        }
      );
  } else if (page === 'moderation') {
    embed
      .setTitle('⚖️ Moderation & Appeal System')
      .setDescription(
        'Complete moderation tools with integrated DM appeals and automated quarantine handling.'
      )
      .addFields(
        {
          name: '🔨 Punishment Commands',
          value:
            '`/warn user:<@user> reason:<text>` — Issue a formal logged warning\n' +
            '`/timeout user:<@user> duration:<time> [reason]` — Mute a member (e.g. `10m`, `1h`, `1d`)\n' +
            '`/untimeout user:<@user>` — Remove timeout from a user\n' +
            '`/kick user:<@user> [reason]` — Kick member with DM appeal option\n' +
            '`/full-kick user:<@user> [reason]` — Immediate kick without appeal (for fast testing)\n' +
            '`/ban user:<@user> [reason] [delete_days]` — Ban member with appeal button\n' +
            '`/softban user:<@user> [reason]` — Kick and purge message history\n' +
            '`/unban user_id:<id> [reason]` — Unban a user via Discord ID\n' +
            '`/clear amount:<1-100> [target]` — Bulk delete messages\n' +
            '`/chatstop duration:<time>` — Temporarily freeze channel chat\n' +
            '`/troll user:<@user>` — Fun aviation photo responder for 10 minutes'
        },
        {
          name: '📝 Integrated Appeal Flow',
          value:
            'Sanctioned users receive a `Submit Appeal` button in DMs. Appeals are sent to `#⚖️ㆍappeals` for 1-click staff review (`Accept` or `Reject`).'
        }
      );
  } else if (page === 'setup') {
    embed
      .setTitle('⚙️ Server Setup, Roles & Utilities')
      .setDescription(
        'Automated tools to manage server hierarchy, persistent pins, and channel inspection.'
      )
      .addFields(
        {
          name: '🛠️ Server Setup',
          value:
            '`/setup-server` — Automatically build entire server channel structure, categories & rules\n' +
            '`/setup-verify` — Deploy the 1-click verification panel in `#verify`\n' +
            '`/post-rules [channel]` — Post formatted official server rules embed\n' +
            '`/list-channels [as-file]` — Export all channel names and IDs'
        },
        {
          name: '📌 Sticky Messages',
          value:
            '`/stick message:<text>` (or `?stick`) — Keep an announcement pinned at the bottom of the channel\n' +
            '`/unstick` (or `?unstick`) — Remove the sticky message'
        },
        {
          name: 'ℹ️ General Information',
          value:
            '`/server-info` — Display complete server metrics, boost tier & owner info\n' +
            '`/whois [user]` (or `/w`) — Detailed member profile card with join dates & roles\n' +
            '`/ping` — Check bot response latency & Discord Gateway connection'
        }
      );
  }

  return embed;
}

function getSelectMenu(selected = 'home') {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help_select_category')
      .setPlaceholder('📂 Browse help categories...')
      .addOptions([
        {
          label: 'Overview & Bot Status',
          description: 'System metrics, ping, uptime, and quick navigation',
          value: 'home',
          emoji: '🏠',
          default: selected === 'home'
        },
        {
          label: 'Planespotting & Ratings',
          description: 'AI Gemini vision, 1-10 voting, and photo leaderboards',
          value: 'spotting',
          emoji: '📸',
          default: selected === 'spotting'
        },
        {
          label: 'JetPhotos Verification',
          description: '2-Factor dashboard check & Pro Spotter role tiers',
          value: 'jetphotos',
          emoji: '✈️',
          default: selected === 'jetphotos'
        },
        {
          label: 'Leveling & XP',
          description: 'Dual Chat XP, Spotter XP, and rank titles',
          value: 'leveling',
          emoji: '💬',
          default: selected === 'leveling'
        },
        {
          label: 'Anti-Spam & Anti-Raid',
          description: 'Raid defense, invite quotas, and spam filters',
          value: 'security',
          emoji: '🛡️',
          default: selected === 'security'
        },
        {
          label: 'Staff & Moderation',
          description: 'Bans, kicks, timeouts, appeals, and logs',
          value: 'moderation',
          emoji: '⚖️',
          default: selected === 'moderation'
        },
        {
          label: 'Server Setup & Tools',
          description: 'Server generator, sticky pins, and inspector',
          value: 'setup',
          emoji: '⚙️',
          default: selected === 'setup'
        }
      ])
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Browse the comprehensive AviBot command & feature guide')
    .addStringOption(opt =>
      opt
        .setName('category')
        .setDescription('Directly open a specific help category')
        .setRequired(false)
        .addChoices(
          { name: '📸 Planespotting & Photo Rating', value: 'spotting' },
          { name: '✈️ JetPhotos Verification', value: 'jetphotos' },
          { name: '💬 Leveling & Activity XP', value: 'leveling' },
          { name: '🛡️ Anti-Spam & Anti-Raid', value: 'security' },
          { name: '⚖️ Moderation & Appeals', value: 'moderation' },
          { name: '⚙️ Server Setup & Utilities', value: 'setup' }
        )
    ),

  getHelpPage,
  getSelectMenu,

  async execute(interaction) {
    const initialCategory = interaction.options.getString('category') || 'home';
    const embed = getHelpPage(initialCategory, interaction.client, interaction.guild);
    const row = getSelectMenu(initialCategory);

    const response = await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: 64 // Ephemeral so only the invoking user sees it cleanly
    });

    // Create interactive collector for 10 minutes
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 10 * 60 * 1000
    });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: '❌ You cannot control this help menu.', flags: 64 });
      }

      const selectedPage = i.values[0];
      const updatedEmbed = getHelpPage(selectedPage, interaction.client, interaction.guild);
      const updatedRow = getSelectMenu(selectedPage);

      await i.update({
        embeds: [updatedEmbed],
        components: [updatedRow]
      });
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  }
};

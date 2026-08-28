const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays a list of all available commands and their usage'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('📖 AviBot Command Guide')
      .setDescription('Here is a breakdown of all available commands categorized by feature:')
      .addFields(
        {
          name: '🛡️ Moderation Commands',
          value: [
            '`/ban <user> [reason] [delete_days]` - Ban a member from the server',
            '`/softban <user> [reason] [delete_days]` - Ban & unban to kick and purge user message history',
            '`/unban <user_id> [reason]` - Unban a user using their Discord ID',
            '`/kick <user> [reason]` - Kick a member from the server',
            '`/timeout <user> <duration> [reason]` - Timeout/mute a member (e.g. 10m, 1h, 1d)',
            '`/untimeout <user> [reason]` - Remove timeout from a member',
            '`/clear <amount> [target]` - Purge 1 to 100 messages (optional user filter)',
            '`/warn <user> <reason>` - Send a formal warning to a member'
          ].join('\n')
        },
        {
          name: '📌 Sticky Messages',
          value: [
            '`?stick` (or `/stick <msg>`) - Locks channel, prompts for content, and keeps it pinned at the bottom',
            '`?unstick` (or `/unstick`) - Removes sticky message from the channel'
          ].join('\n')
        },
        {
          name: '⚙️ Server Setup & Management',
          value: [
            '`/setup-server` - Automatically create channels, categories, and post rules',
            '`/post-rules [channel]` - Post the official server rules embed in a channel',
            '`/list-channels [as-file]` - List all channels in `"channel-name" | id` format'
          ].join('\n')
        },
        {
          name: 'ℹ️ Utility & Information',
          value: [
            '`/server-info` - View server statistics, boost tier, counts, and owner info',
            '`/whois [user]` (or `/w`) - Detailed member profile, join dates, and roles',
            '`/ping` - Check bot response and API WebSocket latency',
            '`/help` - Show this help guide'
          ].join('\n')
        }
      )
      .setFooter({ text: config.footerText })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};

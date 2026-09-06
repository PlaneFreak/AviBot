require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || '1524791551820173622',
  colors: {
    primary: 0x5865F2, // Discord Blurple
    success: 0x57F287, // Green
    warning: 0xFEE75C, // Yellow
    error: 0xED4245,   // Red
    info: 0x3BA55C,    // Darker Green/Info
    neutral: 0x2B2D31  // Dark Embed Background
  },
  emojis: {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    channel: '📁',
    shield: '🛡️',
    rules: '📜',
    settings: '⚙️',
    instagram: '📸'
  },
  instagram: {
    username: process.env.INSTAGRAM_USERNAME || '',
    channelId: process.env.INSTAGRAM_CHANNEL_ID || '',
    webhookPort: parseInt(process.env.INSTAGRAM_WEBHOOK_PORT || '3050', 10),
    webhookSecret: process.env.INSTAGRAM_WEBHOOK_SECRET || '',
    rssUrl: process.env.INSTAGRAM_RSS_URL || '',
    pollIntervalMinutes: parseInt(process.env.INSTAGRAM_POLL_INTERVAL || '3', 10)
  },
  footerText: 'AviBot • Server Management & Moderation'
};

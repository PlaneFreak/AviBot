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
    settings: '⚙️'
  },
  footerText: 'AviBot • Server Management & Moderation'
};

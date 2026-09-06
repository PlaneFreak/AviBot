const instagramService = require('../services/instagramService');
const config = require('../config');

module.exports = {
  start(client) {
    console.log('📸 Instagram Worker initializing...');

    // 1. Start Webhook HTTP Server (for IFTTT / Make / Zapier instant notifications)
    try {
      instagramService.startWebhookServer(client);
    } catch (err) {
      console.error('❌ Failed to start Instagram webhook receiver:', err.message);
    }

    // 2. Start RSS Feed Poller if configured
    if (config.instagram.rssUrl) {
      const intervalMs = Math.max(1, config.instagram.pollIntervalMinutes || 3) * 60 * 1000;
      console.log(`📡 Instagram RSS polling enabled for: ${config.instagram.rssUrl} (every ${config.instagram.pollIntervalMinutes || 3}m)`);

      const poll = async () => {
        try {
          await instagramService.pollRssFeed(client);
        } catch (err) {
          console.error('Error in Instagram RSS poll task:', err);
        }
      };

      // Initial poll after 15 seconds, then recurring
      setTimeout(poll, 15000);
      setInterval(poll, intervalMs);
    } else {
      console.log(`ℹ️ Instagram RSS polling is disabled (no INSTAGRAM_RSS_URL specified in .env).`);
      console.log(`ℹ️ Automated posts can be sent via Webhook (port ${config.instagram.webhookPort || 3000}) or /instagram post command.`);
    }
  }
};

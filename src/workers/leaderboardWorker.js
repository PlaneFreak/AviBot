const db = require('../database/db');
const leaderboardService = require('../services/leaderboardService');

module.exports = {
  start(client) {
    console.log('🏆 Leaderboard Multi-Interval Worker started (checking every 60s)...');

    const checkLeaderboards = async () => {
      try {
        const nowSeconds = Math.floor(Date.now() / 1000);
        const guilds = client.guilds.cache.values();

        for (const guild of guilds) {
          for (const [periodType, conf] of Object.entries(leaderboardService.PERIOD_CONFIG)) {
            const lastRun = db.getLastLeaderboardRun(conf.key, guild.id);

            // If never run, initialize last run to now so it doesn't spam all 5 at startup immediately
            if (!lastRun) {
              db.setLastLeaderboardRun(conf.key, guild.id, nowSeconds);
              continue;
            }

            // Check if period elapsed
            if (nowSeconds - lastRun >= conf.durationSeconds) {
              console.log(`📊 Generating ${conf.name} for guild ${guild.name} (${guild.id})...`);
              await leaderboardService.postLeaderboard(guild, periodType, false);
            }
          }
        }
      } catch (err) {
        console.error('Error in Leaderboard Worker:', err);
      }
    };

    // Run check after initial delay and on 60s intervals
    setTimeout(checkLeaderboards, 10000);
    setInterval(checkLeaderboards, 60 * 1000);
  }
};

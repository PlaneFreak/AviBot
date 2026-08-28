const db = require('../database/db');
const suspensionManager = require('../utils/suspensionManager');

module.exports = {
  start(client) {
    console.log('⏱️ Punishment Expiration Worker started (checking every 60s)...');

    setInterval(async () => {
      try {
        const expiredRecords = await db.getExpiredPendingPunishments();
        if (!expiredRecords || expiredRecords.length === 0) return;

        for (const record of expiredRecords) {
          const guild = client.guilds.cache.get(record.guild_id) || await client.guilds.fetch(record.guild_id).catch(() => null);
          if (!guild) continue;

          console.log(`⏳ Punishment expired for user ${record.user_id} (${record.type}) in guild ${record.guild_id}. Finalizing punishment...`);

          await suspensionManager.finalizePunishment(
            guild,
            record.user_id,
            record.type,
            `5-Day Appeal Window Expired (${record.reason})`
          );

          await db.updatePunishmentStatus(record.id, 'expired_executed');
        }
      } catch (err) {
        console.error('Error in Expiration Worker:', err);
      }
    }, 60 * 1000); // Check every minute
  }
};

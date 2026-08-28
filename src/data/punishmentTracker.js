const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'punishmentData.json');

// Ensure data file exists
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify({}, null, 2), 'utf-8');
}

let punishmentCache = {};
try {
  punishmentCache = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
} catch (e) {
  punishmentCache = {};
}

function save() {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(punishmentCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save punishment data:', err);
  }
}

module.exports = {
  /**
   * Tracks a punishment (ban, kick, timeout) for a user
   */
  recordPunishment(userId, data) {
    punishmentCache[userId] = {
      guildId: data.guildId,
      guildName: data.guildName,
      type: data.type, // 'ban', 'kick', 'timeout', 'softban'
      reason: data.reason || 'No reason provided',
      moderatorTag: data.moderatorTag,
      timestamp: Date.now()
    };
    save();
  },

  /**
   * Gets the latest punishment for a user
   */
  getLatestPunishment(userId) {
    return punishmentCache[userId] || null;
  },

  /**
   * Clears punishment record once appeal is submitted/resolved
   */
  clearPunishment(userId) {
    if (punishmentCache[userId]) {
      delete punishmentCache[userId];
      save();
    }
  }
};

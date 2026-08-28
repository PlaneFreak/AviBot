const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'avibot.sqlite');
let db = null;

function calculateRatingPoints(rating) {
  const r = parseInt(rating, 10);
  if (r <= 2) return 0;
  if (r === 10) return 10; // 8 base + 2 bonus points
  return r - 2; // 3->1, 4->2, 5->3, 6->4, 7->5, 8->6, 9->7
}

function initDB() {
  try {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS punishments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        type TEXT NOT NULL,
        reason TEXT,
        moderator_id TEXT,
        moderator_tag TEXT,
        saved_roles TEXT,
        expires_at INTEGER NOT NULL,
        status TEXT DEFAULT 'pending_appeal',
        hub_message_id TEXT,
        jail_channel_id TEXT,
        case_number INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE TABLE IF NOT EXISTS stickies (
        channel_id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        last_message_id TEXT,
        author_id TEXT,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS photo_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT UNIQUE NOT NULL,
        channel_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        image_url TEXT NOT NULL,
        caption TEXT,
        total_points INTEGER DEFAULT 0,
        total_rating_sum INTEGER DEFAULT 0,
        vote_count INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE TABLE IF NOT EXISTS photo_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        submission_id INTEGER NOT NULL,
        voter_id TEXT NOT NULL,
        rating INTEGER NOT NULL,
        points INTEGER NOT NULL,
        voted_at INTEGER DEFAULT (strftime('%s', 'now')),
        UNIQUE(submission_id, voter_id)
      );

      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        total_points_earned INTEGER DEFAULT 0,
        total_submissions INTEGER DEFAULT 0,
        chat_xp INTEGER DEFAULT 0,
        chat_level INTEGER DEFAULT 1,
        messages_count INTEGER DEFAULT 0,
        voice_seconds INTEGER DEFAULT 0,
        last_message_xp_timestamp INTEGER DEFAULT 0,
        jp_verified INTEGER DEFAULT 0,
        jp_username TEXT,
        jp_photo_count INTEGER DEFAULT 0,
        jp_acceptance_rate TEXT,
        jp_verified_at INTEGER,
        PRIMARY KEY(user_id, guild_id)
      );

      CREATE TABLE IF NOT EXISTS leaderboard_meta (
        key TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        last_run_timestamp INTEGER NOT NULL,
        PRIMARY KEY(key, guild_id)
      );
    `);

    // Auto-migrations for existing tables
    try {
      db.exec(`ALTER TABLE punishments ADD COLUMN jail_channel_id TEXT;`);
    } catch {}
    try {
      db.exec(`ALTER TABLE punishments ADD COLUMN case_number INTEGER DEFAULT 1;`);
    } catch {}
    try {
      db.exec(`ALTER TABLE photo_submissions ADD COLUMN total_rating_sum INTEGER DEFAULT 0;`);
    } catch {}
    try {
      db.exec(`ALTER TABLE user_profiles ADD COLUMN jp_verified INTEGER DEFAULT 0;`);
      db.exec(`ALTER TABLE user_profiles ADD COLUMN jp_username TEXT;`);
      db.exec(`ALTER TABLE user_profiles ADD COLUMN jp_photo_count INTEGER DEFAULT 0;`);
      db.exec(`ALTER TABLE user_profiles ADD COLUMN jp_acceptance_rate TEXT;`);
      db.exec(`ALTER TABLE user_profiles ADD COLUMN jp_verified_at INTEGER;`);
    } catch {}
    try {
      db.exec(`ALTER TABLE user_profiles ADD COLUMN chat_xp INTEGER DEFAULT 0;`);
      db.exec(`ALTER TABLE user_profiles ADD COLUMN chat_level INTEGER DEFAULT 1;`);
      db.exec(`ALTER TABLE user_profiles ADD COLUMN messages_count INTEGER DEFAULT 0;`);
      db.exec(`ALTER TABLE user_profiles ADD COLUMN voice_seconds INTEGER DEFAULT 0;`);
      db.exec(`ALTER TABLE user_profiles ADD COLUMN last_message_xp_timestamp INTEGER DEFAULT 0;`);
    } catch {}

    console.log(`✅ Connected to SQLite3 Database successfully (${dbPath})`);
  } catch (err) {
    console.error('❌ Failed to initialize SQLite database:', err);
  }
}

module.exports = {
  initDB,
  calculateRatingPoints,

  // --- Photo Ranking System Methods ---

  createPhotoSubmission(data) {
    if (!db) initDB();
    const stmt = db.prepare(`
      INSERT INTO photo_submissions (message_id, channel_id, user_id, guild_id, image_url, caption, total_points, total_rating_sum, vote_count)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0)
    `);
    const info = stmt.run(
      data.messageId,
      data.channelId,
      data.userId,
      data.guildId,
      data.imageUrl,
      data.caption || ''
    );
    return { id: info.lastInsertRowid, ...data, total_points: 0, total_rating_sum: 0, vote_count: 0 };
  },

  getPhotoSubmissionByMessageId(messageId) {
    if (!db) initDB();
    const stmt = db.prepare(`SELECT * FROM photo_submissions WHERE message_id = ?`);
    return stmt.get(messageId) || null;
  },

  getPhotoSubmissionById(id) {
    if (!db) initDB();
    const stmt = db.prepare(`SELECT * FROM photo_submissions WHERE id = ?`);
    return stmt.get(id) || null;
  },

  deletePhotoSubmission(messageId) {
    if (!db) initDB();
    const sub = this.getPhotoSubmissionByMessageId(messageId);
    if (sub) {
      db.prepare(`DELETE FROM photo_votes WHERE submission_id = ?`).run(sub.id);
      db.prepare(`DELETE FROM photo_submissions WHERE id = ?`).run(sub.id);
      return true;
    }
    return false;
  },

  addOrUpdateVote(submissionId, voterId, rating) {
    if (!db) initDB();
    const points = calculateRatingPoints(rating);

    const transaction = db.transaction(() => {
      // Check existing vote
      const existingVote = db.prepare(`SELECT * FROM photo_votes WHERE submission_id = ? AND voter_id = ?`).get(submissionId, voterId);

      if (existingVote) {
        // Update existing vote
        db.prepare(`
          UPDATE photo_votes SET rating = ?, points = ?, voted_at = strftime('%s', 'now')
          WHERE submission_id = ? AND voter_id = ?
        `).run(rating, points, submissionId, voterId);
      } else {
        // Insert new vote
        db.prepare(`
          INSERT INTO photo_votes (submission_id, voter_id, rating, points)
          VALUES (?, ?, ?, ?)
        `).run(submissionId, voterId, rating, points);
      }

      // Recalculate totals for submission
      const stats = db.prepare(`
        SELECT COUNT(*) as vote_count, COALESCE(SUM(points), 0) as total_points, COALESCE(SUM(rating), 0) as total_rating_sum
        FROM photo_votes WHERE submission_id = ?
      `).get(submissionId);

      db.prepare(`
        UPDATE photo_submissions
        SET total_points = ?, total_rating_sum = ?, vote_count = ?
        WHERE id = ?
      `).run(stats.total_points, stats.total_rating_sum, stats.vote_count, submissionId);

      return {
        isNew: !existingVote,
        previousRating: existingVote ? existingVote.rating : null,
        newRating: rating,
        pointsAwarded: points,
        totalPoints: stats.total_points,
        totalRatingSum: stats.total_rating_sum,
        voteCount: stats.vote_count,
        averageRating: stats.vote_count > 0 ? (stats.total_rating_sum / stats.vote_count).toFixed(1) : '0.0'
      };
    });

    return transaction();
  },

  getTopPhotosByTimeframe(guildId, sinceSecondsTimestamp, limit = 10) {
    if (!db) initDB();
    const stmt = db.prepare(`
      SELECT * FROM photo_submissions
      WHERE guild_id = ? AND created_at >= ?
      ORDER BY total_points DESC, total_rating_sum DESC, vote_count DESC
      LIMIT ?
    `);
    return stmt.all(guildId, sinceSecondsTimestamp, limit);
  },

  getLastLeaderboardRun(key, guildId) {
    if (!db) initDB();
    const stmt = db.prepare(`SELECT last_run_timestamp FROM leaderboard_meta WHERE key = ? AND guild_id = ?`);
    const row = stmt.get(key, guildId);
    return row ? row.last_run_timestamp : 0;
  },

  setLastLeaderboardRun(key, guildId, timestamp) {
    if (!db) initDB();
    const stmt = db.prepare(`
      INSERT INTO leaderboard_meta (key, guild_id, last_run_timestamp)
      VALUES (?, ?, ?)
      ON CONFLICT(key, guild_id) DO UPDATE SET last_run_timestamp = excluded.last_run_timestamp
    `);
    stmt.run(key, guildId, timestamp);
  },

  // --- User XP & Profile Methods ---

  getUserProfile(userId, guildId) {
    if (!db) initDB();
    let profile = db.prepare(`SELECT * FROM user_profiles WHERE user_id = ? AND guild_id = ?`).get(userId, guildId);
    if (!profile) {
      db.prepare(`INSERT OR IGNORE INTO user_profiles (user_id, guild_id, xp, level) VALUES (?, ?, 0, 1)`).run(userId, guildId);
      profile = { user_id: userId, guild_id: guildId, xp: 0, level: 1, total_points_earned: 0, total_submissions: 0 };
    }
    return profile;
  },

  addXP(userId, guildId, xpToAdd) {
    if (!db) initDB();
    const profile = this.getUserProfile(userId, guildId);
    const newXP = profile.xp + xpToAdd;

    // Progressive leveling formula: Level N requires 50 * (N^1.5) total cumulative XP
    // Calculate new level
    let level = 1;
    while (newXP >= Math.floor(50 * Math.pow(level, 1.5))) {
      level++;
    }

    db.prepare(`
      UPDATE user_profiles
      SET xp = ?, level = ?
      WHERE user_id = ? AND guild_id = ?
    `).run(newXP, level, userId, guildId);

    return {
      previousLevel: profile.level,
      newLevel: level,
      leveledUp: level > profile.level,
      totalXP: newXP
    };
  },

  getUserStats(userId, guildId) {
    if (!db) initDB();
    const profile = this.getUserProfile(userId, guildId);

    // Get best submission
    const bestPhoto = db.prepare(`
      SELECT * FROM photo_submissions
      WHERE user_id = ? AND guild_id = ?
      ORDER BY total_points DESC, total_rating_sum DESC
      LIMIT 1
    `).get(userId, guildId);

    // Get total submissions count
    const subCountRow = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_points), 0) as total_pts
      FROM photo_submissions
      WHERE user_id = ? AND guild_id = ?
    `).get(userId, guildId);

    // Get server position / rank
    const rankRow = db.prepare(`
      SELECT COUNT(*) + 1 as rank
      FROM user_profiles
      WHERE guild_id = ? AND (xp > ? OR (xp = ? AND user_id < ?))
    `).get(guildId, profile.xp, profile.xp, userId);

    return {
      profile,
      rank: rankRow ? rankRow.rank : 1,
      totalSubmissions: subCountRow ? subCountRow.count : 0,
      totalPointsEarned: subCountRow ? subCountRow.total_pts : 0,
      bestPhoto: bestPhoto || null
    };
  },

  getTopUsersByXP(guildId, limit = 10) {
    if (!db) initDB();
    const stmt = db.prepare(`
      SELECT * FROM user_profiles
      WHERE guild_id = ?
      ORDER BY xp DESC, level DESC
      LIMIT ?
    `);
    return stmt.all(guildId, limit);
  },

  addChatXP(userId, guildId, xpToAdd) {
    if (!db) initDB();
    const current = this.getUserProfile(userId, guildId);
    const oldChatXP = current.chat_xp || 0;
    const oldChatLevel = current.chat_level || 1;
    const newChatXP = oldChatXP + xpToAdd;

    const levelHelper = require('../utils/levelHelper');
    const levelData = levelHelper.calculateChatLevelData(newChatXP);
    const newChatLevel = levelData.level;
    const now = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      UPDATE user_profiles
      SET chat_xp = ?,
          chat_level = ?,
          messages_count = messages_count + 1,
          last_message_xp_timestamp = ?
      WHERE user_id = ? AND guild_id = ?
    `);
    stmt.run(newChatXP, newChatLevel, now, userId, guildId);

    return {
      previousLevel: oldChatLevel,
      newLevel: newChatLevel,
      leveledUp: newChatLevel > oldChatLevel,
      totalChatXP: newChatXP,
      levelData
    };
  },

  getTopUsersByChatXP(guildId, limit = 10) {
    if (!db) initDB();
    const stmt = db.prepare(`
      SELECT * FROM user_profiles
      WHERE guild_id = ?
      ORDER BY chat_xp DESC, chat_level DESC
      LIMIT ?
    `);
    return stmt.all(guildId, limit);
  },

  setJetPhotosVerification(userId, guildId, data) {
    if (!db) initDB();
    this.getUserProfile(userId, guildId); // ensure profile exists
    const now = Math.floor(Date.now() / 1000);
    const stmt = db.prepare(`
      UPDATE user_profiles
      SET jp_verified = 1,
          jp_username = ?,
          jp_photo_count = ?,
          jp_acceptance_rate = ?,
          jp_verified_at = ?
      WHERE user_id = ? AND guild_id = ?
    `);
    stmt.run(data.username || null, data.photoCount || 0, data.acceptanceRate || null, now, userId, guildId);
  },

  getJetPhotosProfile(userId, guildId) {
    if (!db) initDB();
    const stmt = db.prepare(`
      SELECT jp_verified, jp_username, jp_photo_count, jp_acceptance_rate, jp_verified_at
      FROM user_profiles
      WHERE user_id = ? AND guild_id = ?
    `);
    return stmt.get(userId, guildId) || null;
  },

  // --- Suspension / Jail Methods ---

  getNextCaseNumber(guildId) {
    if (!db) initDB();
    const row = db.prepare(`SELECT MAX(case_number) as max_case FROM punishments WHERE guild_id = ?`).get(guildId);
    return (row && row.max_case ? row.max_case : 0) + 1;
  },

  createPunishment(data) {
    if (!db) initDB();
    const expiresAt = data.expiresAt instanceof Date ? Math.floor(data.expiresAt.getTime() / 1000) : Math.floor(Date.now() / 1000) + (5 * 24 * 60 * 60);

    const stmt = db.prepare(`
      INSERT INTO punishments (user_id, guild_id, type, reason, moderator_id, moderator_tag, saved_roles, expires_at, status, hub_message_id, jail_channel_id, case_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_appeal', ?, ?, ?)
    `);

    const info = stmt.run(
      data.userId,
      data.guildId,
      data.type,
      data.reason || 'No reason provided',
      data.moderatorId,
      data.moderatorTag,
      JSON.stringify(data.savedRoles || []),
      expiresAt,
      data.hubMessageId || null,
      data.jailChannelId || null,
      data.caseNumber || 1
    );

    return { id: info.lastInsertRowid, ...data, expires_at: expiresAt };
  },

  getActivePunishment(userId, guildId) {
    if (!db) initDB();
    const stmt = db.prepare(`
      SELECT * FROM punishments 
      WHERE user_id = ? AND guild_id = ? AND status = 'pending_appeal' 
      ORDER BY id DESC LIMIT 1
    `);
    return stmt.get(userId, guildId) || null;
  },

  updatePunishmentStatus(id, status) {
    if (!db) initDB();
    const stmt = db.prepare(`UPDATE punishments SET status = ? WHERE id = ?`);
    stmt.run(status, id);
  },

  getExpiredPendingPunishments() {
    if (!db) initDB();
    const nowSeconds = Math.floor(Date.now() / 1000);
    const stmt = db.prepare(`
      SELECT * FROM punishments 
      WHERE status = 'pending_appeal' AND expires_at <= ?
    `);
    return stmt.all(nowSeconds);
  },

  // --- Sticky Methods ---

  getSticky(channelId) {
    if (!db) initDB();
    const stmt = db.prepare(`SELECT * FROM stickies WHERE channel_id = ?`);
    return stmt.get(channelId) || null;
  },

  setSticky(channelId, data) {
    if (!db) initDB();
    const stmt = db.prepare(`
      INSERT INTO stickies (channel_id, content, last_message_id, author_id, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(channel_id) DO UPDATE SET
        content = excluded.content,
        last_message_id = excluded.last_message_id,
        author_id = excluded.author_id,
        updated_at = excluded.updated_at
    `);
    stmt.run(channelId, data.content, data.lastMessageId || null, data.authorId || null, Date.now());
  },

  updateStickyLastMessageId(channelId, messageId) {
    if (!db) initDB();
    const stmt = db.prepare(`UPDATE stickies SET last_message_id = ? WHERE channel_id = ?`);
    stmt.run(messageId, channelId);
  },

  deleteSticky(channelId) {
    if (!db) initDB();
    const stmt = db.prepare(`DELETE FROM stickies WHERE channel_id = ?`);
    const info = stmt.run(channelId);
    return info.changes > 0;
  }
};

module.exports = {
  // ==========================================
  // 📸 Spotter Photography XP System
  // ==========================================

  /**
   * Returns total cumulative XP required to reach a specific Spotter level
   */
  getXPForLevel(level) {
    if (level <= 1) return 0;
    return Math.floor(50 * Math.pow(level - 1, 1.5));
  },

  /**
   * Calculates Spotter level, current level progress, and next level threshold
   */
  calculateLevelData(totalXP) {
    let level = 1;
    while (totalXP >= this.getXPForLevel(level + 1)) {
      level++;
    }

    const currentLevelBaseXP = this.getXPForLevel(level);
    const nextLevelXP = this.getXPForLevel(level + 1);
    const xpNeededForNext = nextLevelXP - currentLevelBaseXP;
    const xpInCurrentLevel = totalXP - currentLevelBaseXP;
    const progressPercent = Math.min(100, Math.max(0, Math.floor((xpInCurrentLevel / xpNeededForNext) * 100)));

    return {
      level,
      totalXP,
      currentLevelBaseXP,
      nextLevelXP,
      xpInCurrentLevel,
      xpNeededForNext,
      progressPercent,
      rankTitle: this.getRankTitle(level),
      progressBar: this.renderProgressBar(xpInCurrentLevel, xpNeededForNext)
    };
  },

  getRankTitle(level) {
    if (level <= 2) return '🛫 Flight Cadet';
    if (level <= 4) return '🛩️ Junior Spotter';
    if (level <= 7) return '📷 Senior Spotter';
    if (level <= 10) return '👨‍✈️ First Officer';
    if (level <= 15) return '🎖️ Captain';
    if (level <= 20) return '👑 Senior Captain';
    return '🌌 Aviation Legend';
  },

  // ==========================================
  // 💬 Community / Chat Activity Level System
  // (Medium to Very Hard Progressive Curve)
  // ==========================================

  /**
   * Returns total cumulative XP required for Chat Activity level N
   * Curve: 150 * (level-1)^1.8 + 200 * (level-1)
   */
  getChatXPForLevel(level) {
    if (level <= 1) return 0;
    const l = level - 1;
    return Math.floor(150 * Math.pow(l, 1.8) + 200 * l);
  },

  /**
   * Calculates Chat Activity level data
   */
  calculateChatLevelData(totalChatXP) {
    let level = 1;
    while (totalChatXP >= this.getChatXPForLevel(level + 1)) {
      level++;
    }

    const currentLevelBaseXP = this.getChatXPForLevel(level);
    const nextLevelXP = this.getChatXPForLevel(level + 1);
    const xpNeededForNext = nextLevelXP - currentLevelBaseXP;
    const xpInCurrentLevel = totalChatXP - currentLevelBaseXP;
    const progressPercent = Math.min(100, Math.max(0, Math.floor((xpInCurrentLevel / xpNeededForNext) * 100)));

    return {
      level,
      totalXP: totalChatXP,
      currentLevelBaseXP,
      nextLevelXP,
      xpInCurrentLevel,
      xpNeededForNext,
      progressPercent,
      rankTitle: this.getChatRankTitle(level),
      progressBar: this.renderProgressBar(xpInCurrentLevel, xpNeededForNext)
    };
  },

  /**
   * Community Chat Rank Titles
   */
  getChatRankTitle(level) {
    if (level <= 4) return '💬 Passenger';
    if (level <= 9) return '🎫 Frequent Flyer';
    if (level <= 19) return '🛫 Silver Aviator';
    if (level <= 29) return '🌟 Gold Aviator';
    if (level <= 49) return '💎 Diamond Aviator';
    return '👑 Server Legend';
  },

  /**
   * Renders a clean visual Unicode progress bar
   */
  renderProgressBar(current, target, length = 10) {
    if (target <= 0) target = 1;
    const fraction = Math.min(1, Math.max(0, current / target));
    const filled = Math.round(fraction * length);
    const empty = length - filled;
    return `${'▰'.repeat(filled)}${'▱'.repeat(empty)} ${Math.floor(fraction * 100)}%`;
  }
};

module.exports = {
  /**
   * Returns total cumulative XP required to reach a specific level
   */
  getXPForLevel(level) {
    if (level <= 1) return 0;
    // Level 2 = 50, Level 3 = 141, Level 4 = 260, etc.
    return Math.floor(50 * Math.pow(level - 1, 1.5));
  },

  /**
   * Calculates level, current level progress, and next level threshold from cumulative XP
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

  /**
   * Aviation-themed Rank Titles based on Level
   */
  getRankTitle(level) {
    if (level <= 2) return '🛫 Flight Cadet';
    if (level <= 4) return '🛩️ Junior Spotter';
    if (level <= 7) return '📷 Senior Spotter';
    if (level <= 10) return '👨‍✈️ First Officer';
    if (level <= 15) return '🎖️ Captain';
    if (level <= 20) return '👑 Senior Captain';
    return '🌌 Aviation Legend';
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

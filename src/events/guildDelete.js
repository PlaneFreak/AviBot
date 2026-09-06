const { Events } = require('discord.js');

module.exports = {
  name: Events.GuildDelete,
  async execute(guild) {
    console.log(`📤 Bot removed from guild: ${guild.name} (${guild.id})`);

    // Clean up invite cache to prevent memory leak
    try {
      const inviteService = require('../services/inviteService');
      inviteService.clearGuildCache(guild.id);
    } catch (err) {
      console.error('Error cleaning up invite cache on guild delete:', err.message);
    }
  }
};

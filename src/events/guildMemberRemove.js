const { Events } = require('discord.js');
const inviteService = require('../services/inviteService');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    if (member.user?.bot) return;

    try {
      await inviteService.handleMemberLeave(member);
    } catch (err) {
      console.error('Error in guildMemberRemove handler:', err);
    }
  }
};

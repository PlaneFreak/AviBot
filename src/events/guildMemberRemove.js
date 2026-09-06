const { Events } = require('discord.js');
const inviteService = require('../services/inviteService');
const leaveLogService = require('../services/leaveLogService');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    if (member.user?.bot) return;

    try {
      await inviteService.handleMemberLeave(member);
    } catch (err) {
      console.error('Error in inviteService.handleMemberLeave:', err);
    }

    try {
      await leaveLogService.logMemberLeave(member);
    } catch (err) {
      console.error('Error in leaveLogService.logMemberLeave:', err);
    }
  }
};


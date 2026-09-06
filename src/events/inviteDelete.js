const { Events } = require('discord.js');
const inviteService = require('../services/inviteService');

module.exports = {
  name: Events.InviteDelete,
  async execute(invite) {
    try {
      inviteService.handleInviteDelete(invite);
    } catch (err) {
      console.error('Error in inviteDelete handler:', err);
    }
  }
};

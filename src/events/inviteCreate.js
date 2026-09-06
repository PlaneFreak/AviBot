const { Events } = require('discord.js');
const inviteService = require('../services/inviteService');

module.exports = {
  name: Events.InviteCreate,
  async execute(invite) {
    try {
      inviteService.handleInviteCreate(invite);
    } catch (err) {
      console.error('Error in inviteCreate handler:', err);
    }
  }
};

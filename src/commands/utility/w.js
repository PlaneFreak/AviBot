const whoisCommand = require('./whois');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('w')
    .setDescription('Short alias for /whois - View detailed member information')
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to view information about')
        .setRequired(false)
    ),

  async execute(interaction) {
    return whoisCommand.execute(interaction);
  }
};

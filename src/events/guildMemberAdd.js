const { Events, ChannelType } = require('discord.js');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    if (member.user.bot) return;

    try {
      const guild = member.guild;
      const channels = await guild.channels.fetch();
      const welcomeChannel = channels.find(
        c => c && c.type === ChannelType.GuildText && (c.name.toLowerCase().includes('welcome'))
      );

      if (welcomeChannel) {
        // Send ghost ping notification in #welcome that immediately deletes
        const pingMsg = await welcomeChannel.send({
          content: `${member} check out this channel.`
        });

        await pingMsg.delete().catch(() => {});
        console.log(`👋 Sent and deleted instant welcome ping for ${member.user.tag} in #${welcomeChannel.name}`);
      }

      // Anti-Raid Security Monitor (Mass Join / Flood Defense)
      const antiRaidService = require('../services/antiRaidService');
      await antiRaidService.handleMemberJoin(member).catch(() => {});

      // Automatically assign 💎ㆍOG Member role if member is within the first 100
      const ogRoleService = require('../services/ogRoleService');
      await ogRoleService.checkAndAssignOGOnJoin(member).catch(() => {});
    } catch (err) {
      console.error('Error in guildMemberAdd handler:', err);
    }
  }
};

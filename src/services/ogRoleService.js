const OG_ROLE_NAME = '💎ㆍOG Member';
const MAX_OG_MEMBERS = 100;

module.exports = {
  OG_ROLE_NAME,
  MAX_OG_MEMBERS,

  /**
   * Finds or creates the 💎ㆍOG Member role
   */
  async getOrCreateOGRole(guild) {
    const roles = await guild.roles.fetch();
    let role = roles.find(r => r.name === OG_ROLE_NAME || r.name.toLowerCase().includes('og member'));

    if (!role) {
      role = await guild.roles.create({
        name: OG_ROLE_NAME,
        color: 0x00E5FF, // Diamond Cyan
        hoist: true,
        permissions: [],
        reason: 'Auto-creation of OG Member role (First 100 members)'
      });
      console.log(`💎 Created "${OG_ROLE_NAME}" role in ${guild.name}`);
    }

    return role;
  },

  /**
   * Syncs the OG Member role across the entire guild (First 100 non-bot members)
   */
  async syncOGRolesForGuild(guild) {
    try {
      const ogRole = await this.getOrCreateOGRole(guild);
      const members = await guild.members.fetch();

      // Filter out bots and sort by joinedTimestamp ascending (earliest first)
      const humanMembers = members
        .filter(m => !m.user.bot)
        .sort((a, b) => (a.joinedTimestamp || 0) - (b.joinedTimestamp || 0));

      const humanArray = Array.from(humanMembers.values());
      const eligibleOGs = humanArray.slice(0, MAX_OG_MEMBERS);
      const eligibleSet = new Set(eligibleOGs.map(m => m.id));

      let addedCount = 0;

      for (const member of eligibleOGs) {
        if (!member.roles.cache.has(ogRole.id)) {
          await member.roles.add(ogRole, `First 100 Member Reward (#${humanArray.indexOf(member) + 1})`).catch(err => {
            console.warn(`Could not add OG role to ${member.user.tag}:`, err.message);
          });
          addedCount++;
          await new Promise(r => setTimeout(r, 500));
        }
      }

      // Position 💎ㆍOG Member role exactly 1 position above ✈️ㆍVerified role
      const verifiedRole = guild.roles.cache.find(r => r.name.toLowerCase().includes('verified'));
      if (verifiedRole && ogRole) {
        const targetPos = verifiedRole.position + 1;
        if (ogRole.position !== targetPos) {
          await ogRole.setPosition(targetPos, { reason: 'Position OG Member directly above Verified role' }).catch(err => {
            console.warn('Could not set OG role position:', err.message);
          });
          console.log(`💎 Positioned 💎ㆍOG Member role at position ${targetPos} (directly above @${verifiedRole.name})`);
        }
      }

      console.log(`💎 OG Role Sync Complete for ${guild.name}: ${eligibleOGs.length}/${humanArray.length} eligible (${addedCount} newly assigned)`);
      return {
        totalHumans: humanArray.length,
        eligibleCount: eligibleOGs.length,
        newlyAssigned: addedCount
      };
    } catch (err) {
      console.error('Error syncing OG roles for guild:', err);
      return null;
    }
  },

  /**
   * Checks and assigns the OG Member role when a new member joins
   */
  async checkAndAssignOGOnJoin(member) {
    if (member.user.bot) return;

    try {
      const guild = member.guild;
      const ogRole = await this.getOrCreateOGRole(guild);
      const members = await guild.members.fetch();

      const humanMembers = members
        .filter(m => !m.user.bot)
        .sort((a, b) => (a.joinedTimestamp || 0) - (b.joinedTimestamp || 0));

      const humanArray = Array.from(humanMembers.values());
      const memberIndex = humanArray.findIndex(m => m.id === member.id);

      // Check if user is within the first 100 human members
      if (memberIndex !== -1 && memberIndex < MAX_OG_MEMBERS) {
        if (!member.roles.cache.has(ogRole.id)) {
          await member.roles.add(ogRole, `First 100 OG Member (#${memberIndex + 1})`).catch(() => {});
          console.log(`💎 Granted ${OG_ROLE_NAME} to new member ${member.user.tag} (Member #${memberIndex + 1})`);
        }
      }
    } catch (err) {
      console.error('Error checking OG role on member join:', err);
    }
  }
};

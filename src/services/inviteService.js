const db = require('../database/db');

// In-memory cache mapping: Map<guildId, Map<inviteCode, uses>>
const guildInvitesCache = new Map();
// Cache for vanity invite uses
const vanityUsesCache = new Map();

module.exports = {
  /**
   * Initializes the invite cache for all accessible guilds on startup
   */
  async initInvites(client) {
    try {
      console.log('🔄 Initializing Invite Counter Cache across all servers...');
      for (const [, guild] of client.guilds.cache) {
        await this.cacheGuildInvites(guild);
      }
      console.log(`✅ Invite Counter Cache initialized for ${client.guilds.cache.size} server(s).`);
    } catch (err) {
      console.error('Error initializing invite cache:', err);
    }
  },

  /**
   * Caches all current invites for a specific guild
   */
  async cacheGuildInvites(guild) {
    try {
      if (!guild.members.me?.permissions.has('ManageGuild')) {
        console.warn(`⚠️ Cannot cache invites for ${guild.name} (Missing 'Manage Server' permission)`);
        return;
      }

      const firstInvites = await guild.invites.fetch().catch(() => null);
      const inviteMap = new Map();

      if (firstInvites) {
        for (const [, inv] of firstInvites) {
          inviteMap.set(inv.code, inv.uses || 0);
        }
      }

      guildInvitesCache.set(guild.id, inviteMap);

      // Cache vanity URL if guild has vanity feature
      if (guild.vanityURLCode) {
        const vanityData = await guild.fetchVanityData().catch(() => null);
        if (vanityData) {
          vanityUsesCache.set(guild.id, vanityData.uses || 0);
        }
      }
    } catch (err) {
      console.error(`Failed to cache invites for guild ${guild.name}:`, err.message);
    }
  },

  /**
   * Processes a new member join to identify the exact inviter
   */
  async handleMemberJoin(member) {
    const guild = member.guild;
    let inviterUser = null;
    let inviteCodeUsed = null;
    let isVanity = false;

    try {
      if (guild.members.me?.permissions.has('ManageGuild')) {
        const currentInvites = await guild.invites.fetch().catch(() => null);
        const cachedMap = guildInvitesCache.get(guild.id) || new Map();

        if (currentInvites) {
          // Find the invite whose use count increased
          for (const [, inv] of currentInvites) {
            const previousUses = cachedMap.get(inv.code) || 0;
            if (inv.uses > previousUses) {
              inviterUser = inv.inviter;
              inviteCodeUsed = inv.code;
              break;
            }
          }

          // Update the cache with new invite counts
          const newMap = new Map();
          for (const [, inv] of currentInvites) {
            newMap.set(inv.code, inv.uses || 0);
          }
          guildInvitesCache.set(guild.id, newMap);
        }

        // Check Vanity URL if not found
        if (!inviterUser && guild.vanityURLCode) {
          const vanityData = await guild.fetchVanityData().catch(() => null);
          if (vanityData) {
            const previousVanity = vanityUsesCache.get(guild.id) || 0;
            if (vanityData.uses > previousVanity) {
              isVanity = true;
              inviteCodeUsed = guild.vanityURLCode;
              vanityUsesCache.set(guild.id, vanityData.uses);
            }
          }
        }
      }

      // Check account age (Anti-Fake / Anti-Alt Detection):
      // If account was created less than 3 days ago OR user invited themselves
      const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
      const isSelfInvite = inviterUser && inviterUser.id === member.id;
      const isFake = accountAgeDays < 3 || isSelfInvite;

      const inviterId = inviterUser ? inviterUser.id : (isVanity ? 'VANITY_URL' : null);

      // Record join in database
      db.recordMemberJoin(
        member.id,
        guild.id,
        inviterId,
        inviteCodeUsed,
        isFake
      );

      const stats = inviterUser ? db.getMemberInvites(inviterUser.id, guild.id) : null;

      console.log(`📥 [Invite Tracker] ${member.user.tag} joined ${guild.name} via ${inviterUser ? `@${inviterUser.tag}` : (isVanity ? 'Vanity URL' : 'Direct / Unknown')} (Code: ${inviteCodeUsed || 'N/A'}${isFake ? ' • Fake/Alt Flagged' : ''})`);

      return {
        inviter: inviterUser,
        inviteCode: inviteCodeUsed,
        isVanity,
        isFake,
        stats
      };
    } catch (err) {
      console.error('Error handling member join invite tracking:', err);
      return { inviter: null, inviteCode: null, isVanity: false, isFake: false, stats: null };
    }
  },

  /**
   * Processes member leave to update inviter's left count
   */
  async handleMemberLeave(member) {
    try {
      const guild = member.guild;
      const inviterId = db.recordMemberLeave(member.id, guild.id);

      if (inviterId && inviterId !== 'VANITY_URL') {
        const stats = db.getMemberInvites(inviterId, guild.id);
        console.log(`📤 [Invite Tracker] ${member.user?.tag || member.id} left ${guild.name}. Updated inviter <@${inviterId}> (Net: ${stats.total} • Left: ${stats.left})`);
        return { inviterId, stats };
      }
    } catch (err) {
      console.error('Error handling member leave invite tracking:', err);
    }
    return null;
  },

  /**
   * Updates cache when a new invite is created
   */
  handleInviteCreate(invite) {
    const map = guildInvitesCache.get(invite.guild.id) || new Map();
    map.set(invite.code, invite.uses || 0);
    guildInvitesCache.set(invite.guild.id, map);
  },

  /**
   * Updates cache when an invite is deleted
   */
  handleInviteDelete(invite) {
    const map = guildInvitesCache.get(invite.guild.id);
    if (map) {
      map.delete(invite.code);
    }
  },

  clearGuildCache(guildId) {
    guildInvitesCache.delete(guildId);
    vanityUsesCache.delete(guildId);
    console.log(`🧹 Cleared invite cache for guild ${guildId}`);
  }
};

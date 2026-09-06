const { PermissionFlagsBits } = require('discord.js');
const adminLogService = require('./adminLogService');
const verificationService = require('./verificationService');

const RAID_WINDOW_MS = 10000;         // 10 seconds
const RAID_THRESHOLD_JOINS = 6;       // 6 joins within 10 seconds
const MIN_ACCOUNT_AGE_HOURS = 24;     // Flag accounts under 24 hours old
const AUTO_UNLOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes lockdown duration

const guildStates = new Map();

function getGuildState(guildId) {
  let state = guildStates.get(guildId);
  if (!state) {
    state = {
      recentJoins: [],
      isLockdownActive: false,
      lockdownTimeout: null
    };
    guildStates.set(guildId, state);
  }
  return state;
}

module.exports = {
  isLockdownActive(guildId) {
    return getGuildState(guildId).isLockdownActive;
  },

  /**
   * Evaluates incoming member joins for mass raid patterns
   */
  async handleMemberJoin(member) {
    if (member.user.bot) return;

    const now = Date.now();
    const guild = member.guild;
    const accountAgeHours = (now - member.user.createdTimestamp) / (1000 * 60 * 60);

    const state = getGuildState(guild.id);

    state.recentJoins.push({
      id: member.id,
      tag: member.user.tag,
      joinedAt: now,
      accountAgeHours
    });

    // Keep only joins in the sliding window
    state.recentJoins = state.recentJoins.filter(j => now - j.joinedAt <= RAID_WINDOW_MS);

    // Check if Join Flood threshold is breached
    if (state.recentJoins.length >= RAID_THRESHOLD_JOINS && !state.isLockdownActive) {
      await this.activateLockdown(guild, `Mass Join Flood (${state.recentJoins.length} joins in ${RAID_WINDOW_MS / 1000}s)`);
    }

    // If lockdown is active and new account joined (<24h old), auto-timeout/quarantine
    if (state.isLockdownActive && accountAgeHours < MIN_ACCOUNT_AGE_HOURS) {
      await member.timeout(15 * 60 * 1000, '[Anti-Raid] Suspicious new account during active raid').catch(() => {});
      console.log(`🚨 Auto-timed out suspicious new account ${member.user.tag} (Age: ${accountAgeHours.toFixed(1)}h) during raid.`);
    }
  },

  /**
   * Activates Server Lockdown Mode
   */
  async activateLockdown(guild, reason = 'Automated Raid Detection') {
    const state = getGuildState(guild.id);
    if (state.isLockdownActive) return;
    state.isLockdownActive = true;

    console.log(`🚨 [ANTI-RAID] Activating Server Lockdown for ${guild.name}: ${reason}`);

    // Lock verify channel temporarily
    const verifyChannel = await verificationService.getOrCreateVerifyChannel(guild).catch(() => null);
    if (verifyChannel) {
      await verifyChannel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: false,
        AddReactions: false
      }).catch(() => {});
    }

    // Log to Admin Logs & Staff Channels
    const adminChannel = await adminLogService.getOrCreateAdminLogChannel(guild);
    if (adminChannel) {
      const componentsV2 = require('../utils/componentsV2');
      const alertContainer = componentsV2.createContainer({
        accentColor: 0xE74C3C,
        components: [
          componentsV2.createSection({
            text: `# 🚨 EMERGENCY SERVER LOCKDOWN ACTIVATED\n\n**Reason:** ${reason}\n**Status:** 🔒 Server verification locked to protect against raid!\n**Recent Joins:** ${state.recentJoins.length} users in the last 10 seconds\n\n*The lockdown will automatically lift in **10 minutes**, or staff can use \`/antiraid lockdown state:disable\` to reopen manually.*\n\n*AviBot Security Engine • Emergency Raid Defense*`
          })
        ]
      });

      await adminChannel.send({ content: '@here 🚨 **ATTENTION STAFF: RAID DETECTED!**' }).catch(() => {});
      await componentsV2.sendToChannel(guild.client, adminChannel.id, [alertContainer]).catch(() => {});
    }

    // Set auto-unlock timer
    if (state.lockdownTimeout) clearTimeout(state.lockdownTimeout);
    state.lockdownTimeout = setTimeout(async () => {
      await this.liftLockdown(guild, 'Automatic Timer (10m Elapsed)');
    }, AUTO_UNLOCK_DURATION_MS);
  },

  /**
   * Lifts Server Lockdown Mode
   */
  async liftLockdown(guild, reason = 'Staff Manual Unlock') {
    const state = getGuildState(guild.id);
    if (!state.isLockdownActive) return;
    state.isLockdownActive = false;
    if (state.lockdownTimeout) clearTimeout(state.lockdownTimeout);

    console.log(`🟢 [ANTI-RAID] Lifting Server Lockdown for ${guild.name}: ${reason}`);

    // Restore verify channel permissions
    const verifyChannel = await verificationService.getOrCreateVerifyChannel(guild).catch(() => null);
    if (verifyChannel) {
      await verifyChannel.permissionOverwrites.edit(guild.roles.everyone, {
        ViewChannel: true,
        ReadMessageHistory: true,
        SendMessages: false
      }).catch(() => {});
    }

    // Log to Admin Logs
    const adminChannel = await adminLogService.getOrCreateAdminLogChannel(guild);
    if (adminChannel) {
      const componentsV2 = require('../utils/componentsV2');
      const unlockContainer = componentsV2.createContainer({
        accentColor: 0x2ECC71,
        components: [
          componentsV2.createSection({
            text: `# 🟢 Server Lockdown Lifted\n\n**Status:** Server is back in normal operation mode.\n**Authorized by:** ${reason}`
          })
        ]
      });

      await componentsV2.sendToChannel(guild.client, adminChannel.id, [unlockContainer]).catch(() => {});
    }
  },

  /**
   * Returns current statistics
   */
  getStatus(guildId) {
    const state = getGuildState(guildId);
    return {
      isLockdownActive: state.isLockdownActive,
      recentJoinCount: state.recentJoins.length,
      threshold: RAID_THRESHOLD_JOINS,
      windowSeconds: RAID_WINDOW_MS / 1000,
      minAccountAgeHours: MIN_ACCOUNT_AGE_HOURS
    };
  }
};

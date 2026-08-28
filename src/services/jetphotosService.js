const { PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const geminiService = require('./geminiService');

const JP_PRO_ROLE_NAME = '🏆ㆍJP Pro Spotter';
const JP_SPOTTER_ROLE_NAME = '✈️ㆍJP Spotter';

module.exports = {
  JP_PRO_ROLE_NAME,
  JP_SPOTTER_ROLE_NAME,

  /**
   * Finds or creates the JetPhotos community roles
   */
  async getOrCreateJetPhotosRoles(guild) {
    const roles = await guild.roles.fetch();

    let proRole = roles.find(r => r.name === JP_PRO_ROLE_NAME || r.name.toLowerCase().includes('jp pro'));
    if (!proRole) {
      proRole = await guild.roles.create({
        name: JP_PRO_ROLE_NAME,
        color: 0xF1C40F, // Gold
        hoist: true,
        permissions: [],
        reason: 'Auto-creation of JetPhotos Pro Spotter role (150+ photos)'
      });
    }

    let spotterRole = roles.find(r => r.name === JP_SPOTTER_ROLE_NAME || (r.name.toLowerCase().includes('jp spotter') && !r.name.includes('pro')));
    if (!spotterRole) {
      spotterRole = await guild.roles.create({
        name: JP_SPOTTER_ROLE_NAME,
        color: 0x3498DB, // Blue
        hoist: true,
        permissions: [],
        reason: 'Auto-creation of JetPhotos Spotter role (1+ photos)'
      });
    }

    return { proRole, spotterRole };
  },

  /**
   * Verifies JetPhotos account ownership via Gemini Vision
   */
  async verifyMemberJetPhotos(member, guild, screenshotUrl, mimeType = 'image/jpeg') {
    const analysis = await geminiService.verifyJetPhotosDashboard(screenshotUrl, mimeType);

    if (!analysis || !analysis.success) {
      return {
        verified: false,
        reason: analysis?.error || 'AI could not process the screenshot. Please try again with a clearer image.'
      };
    }

    // Strict Ownership Check: Must show the full browser URL and the private Acceptance Rate
    if (!analysis.hasFullUrl) {
      return {
        verified: false,
        reason:
          '⚠️ **Browser URL Bar Missing!**\n' +
          'The entire browser address bar showing the full **JetPhotos URL** (`https://www.jetphotos.com/...`) was not visible in your screenshot.\n\n' +
          '📌 **How to verify:**\n' +
          '1. Log into your account on [JetPhotos](https://www.jetphotos.com/).\n' +
          '2. Take a **full screenshot** showing your browser address bar with the complete URL and your personal **Acceptance Rate** (e.g. *84.5%*).\n' +
          '3. Upload the full screenshot with `/jetphotos-verify`.'
      };
    }

    if (!analysis.hasAcceptanceRate) {
      return {
        verified: false,
        reason:
          '⚠️ **Private Acceptance Rate Missing!**\n' +
          'We could not detect your private **Acceptance Ratio / Acceptance Rate** in the screenshot.\n\n' +
          '📌 **How to verify:**\n' +
          '1. Log into your account on [JetPhotos](https://www.jetphotos.com/).\n' +
          '2. Open your personal **Upload Queue / User Dashboard** where your private **Acceptance Rate** (e.g. *84.5%*) and accepted photo count are displayed.\n' +
          '3. Take a full screenshot including the browser URL bar and upload it with `/jetphotos-verify`.'
      };
    }

    const { proRole, spotterRole } = await this.getOrCreateJetPhotosRoles(guild);
    const photoCount = analysis.acceptedPhotos || 0;
    const isPro = photoCount >= 150;

    // Save verification data to SQLite
    db.setJetPhotosVerification(member.id, guild.id, {
      username: analysis.username,
      photoCount: photoCount,
      acceptanceRate: analysis.acceptanceRate
    });

    const grantedRoles = [];

    // Assign roles based on accepted count
    if (isPro) {
      if (!member.roles.cache.has(proRole.id)) {
        await member.roles.add(proRole, `JetPhotos Verification: ${photoCount} accepted photos (150+ threshold)`).catch(() => {});
        grantedRoles.push(proRole.name);
      }
      if (!member.roles.cache.has(spotterRole.id)) {
        await member.roles.add(spotterRole, `JetPhotos Verification: ${photoCount} accepted photos`).catch(() => {});
        grantedRoles.push(spotterRole.name);
      }
    } else if (photoCount > 0) {
      if (!member.roles.cache.has(spotterRole.id)) {
        await member.roles.add(spotterRole, `JetPhotos Verification: ${photoCount} accepted photos`).catch(() => {});
        grantedRoles.push(spotterRole.name);
      }
    }

    return {
      verified: true,
      username: analysis.username,
      photoCount: photoCount,
      acceptanceRate: analysis.acceptanceRate,
      isPro: isPro,
      grantedRoles: grantedRoles
    };
  }
};

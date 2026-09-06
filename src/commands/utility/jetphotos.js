const { SlashCommandBuilder } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
const db = require('../../database/db');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jetphotos')
    .setDescription('Displays a member’s verified JetPhotos stats and photographer profile')
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member whose JetPhotos profile you want to view (defaults to yourself)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guild = interaction.guild;

    const profile = db.getJetPhotosProfile(targetUser.id, guild.id);

    if (!profile || !profile.jp_verified) {
      const mdText = `# ✈️ JetPhotos Status\n\n${targetUser} has not verified a personal JetPhotos account yet.\n\n**Want to link your account?**\nUse \`/jetphotos-verify\` with a screenshot of your personal dashboard to unlock your role!\n\n*${config.footerText}*`;
      
      const container = componentsV2.createContainer({
        accentColor: config.colors.warning,
        components: [
          componentsV2.createSection({ text: mdText })
        ]
      });

      return componentsV2.replyToInteraction(interaction, [container]);
    }

    const isPro = profile.jp_photo_count >= 150;
    
    let mdText = `**${targetUser.tag}’s JetPhotos Profile**\n\n`;
    mdText += `**👤 Photographer Name**\n\`${profile.jp_username || 'Verified User'}\`\n\n`;
    mdText += `**📸 Accepted Photos**\n**${profile.jp_photo_count}** photos\n\n`;
    mdText += `**📊 Acceptance Rate**\n**${profile.jp_acceptance_rate || 'Verified'}**\n\n`;
    mdText += `**🎖️ Current Tier**\n${isPro ? '🏆 **JetPhotos PRO Spotter (150+)**' : '✈️ **JetPhotos Spotter**'}\n\n`;
    mdText += `**🗓️ Verified Since**\n${profile.jp_verified_at ? `<t:${profile.jp_verified_at}:D>` : 'Recently'}\n\n`;
    
    mdText += `*${config.footerText} • Authenticated via Gemini AI Vision* <t:${Math.floor(Date.now() / 1000)}:R>`;

    const container = componentsV2.createContainer({
      accentColor: isPro ? 0xF1C40F : 0x3498DB,
      components: [
        componentsV2.createSection({
          text: mdText,
          accessory: componentsV2.createThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        })
      ]
    });

    return componentsV2.replyToInteraction(interaction, [container]);
  }
};

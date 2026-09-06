const { SlashCommandBuilder } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
const jetphotosService = require('../../services/jetphotosService');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jetphotos-verify')
    .setDescription('Verifies your JetPhotos photographer account and unlocks the JP Pro role (150+ photos)')
    .setDMPermission(false)
    .addAttachmentOption(option =>
      option
        .setName('screenshot')
        .setDescription('Screenshot of your logged-in JetPhotos dashboard/queue showing your private Acceptance Rate')
        .setRequired(true)
    ),

  async execute(interaction) {
    const attachment = interaction.options.getAttachment('screenshot');
    const member = interaction.member;
    const guild = interaction.guild;

    // Check if attachment is an image
    if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
      return interaction.reply({
        content: `${config.emojis.error} Please upload a valid image screenshot (PNG, JPG, or WEBP).`,
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await jetphotosService.verifyMemberJetPhotos(
        member,
        guild,
        attachment.url,
        attachment.contentType
      );

      if (!result.verified) {
        const mdText = `# ❌ JetPhotos Verification Failed\n\n${result.reason}\n\n*${config.footerText} • Anti-Impersonation Check*`;
        
        const container = componentsV2.createContainer({
          accentColor: config.colors.error,
          components: [
            componentsV2.createSection({ text: mdText })
          ]
        });

        return componentsV2.editInteractionReply(interaction, [container]);
      }

      let statusTitle = '✈️ JetPhotos Spotter Verified!';
      let statusColor = 0x2ECC71;
      let roleDescription = '';

      if (result.isPro) {
        statusTitle = '🏆 JetPhotos PRO Spotter Verified!';
        statusColor = 0xF1C40F;
        roleDescription = `🌟 **Achievement Unlocked:** You have **${result.photoCount} accepted photos** (150+ threshold) and have been awarded the exclusive **@${jetphotosService.JP_PRO_ROLE_NAME}** role!`;
      } else if (result.photoCount >= 1) {
        statusTitle = '✈️ JetPhotos Spotter Verified!';
        statusColor = 0x3498DB;
        roleDescription = `⭐ You have **${result.photoCount} accepted photos** and have been awarded the **@${jetphotosService.JP_SPOTTER_ROLE_NAME}** role! Reach **150 accepted photos** to unlock **@${jetphotosService.JP_PRO_ROLE_NAME}**!`;
      } else {
        statusTitle = 'ℹ️ JetPhotos Account Authenticated';
        statusColor = 0x95A5A6;
        roleDescription = `ℹ️ Your account ownership was verified, but you currently have **0 accepted photos** on JetPhotos.\n\n*The **@${jetphotosService.JP_SPOTTER_ROLE_NAME}** role requires at least **1 accepted photo**. Keep uploading to JetPhotos and re-run \`/jetphotos-verify\` once your first photo gets accepted!*`;
      }

      let successMd = `# ${statusTitle}\n\n`;
      successMd += `Congratulations ${member}! Your personal JetPhotos account ownership has been successfully authenticated.\n\n`;
      successMd += `**Authenticated Account Data:**\n`;
      successMd += `• 👤 **Photographer:** \`${result.username || 'JetPhotos User'}\`\n`;
      successMd += `• 📸 **Accepted Database Photos:** **${result.photoCount}** photos\n`;
      successMd += `• 📊 **Private Acceptance Rate:** **${result.acceptanceRate || 'Verified'}** *(Proof of Ownership)*\n\n`;
      successMd += `${roleDescription}\n\n`;
      successMd += `*${config.footerText} • Verified via Gemini AI Vision* <t:${Math.floor(Date.now() / 1000)}:R>`;

      const successContainer = componentsV2.createContainer({
        accentColor: statusColor,
        components: [
          componentsV2.createSection({ text: successMd })
        ]
      });

      // If user unlocked JP Pro (150+ photos), announce in #chat or #jetphotos
      if (result.isPro) {
        const channels = await guild.channels.fetch();
        const jpChannel = channels.find(c => c && c.name.toLowerCase().includes('jetphotos')) ||
                          channels.find(c => c && c.name.toLowerCase().includes('chat') && !c.name.includes('staff'));

        if (jpChannel) {
          const announceMd = `# 🏆 New JetPhotos PRO Spotter In the Server!\n\n`;
          announceMd += `Give it up for ${member} who just verified their JetPhotos portfolio with **${result.photoCount} accepted photos**!\n\n`;
          announceMd += `🎖️ Role Awarded: **@${jetphotosService.JP_PRO_ROLE_NAME}**\n\n`;
          announceMd += `*${config.footerText} • Congratulations!* <t:${Math.floor(Date.now() / 1000)}:R>`;
          
          const announceContainer = componentsV2.createContainer({
            accentColor: 0xF1C40F,
            components: [
              componentsV2.createSection({ text: announceMd })
            ]
          });

          await componentsV2.sendToChannel(interaction.client, jpChannel.id, [announceContainer]);
        }
      }

      return componentsV2.editInteractionReply(interaction, [successContainer]);
    } catch (err) {
      console.error('Error in /jetphotos-verify command:', err);
      return interaction.editReply({
        content: `${config.emojis.error} Verification processing failed: ${err.message}`
      });
    }
  }
};

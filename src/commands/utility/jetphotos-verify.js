const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
        const failEmbed = new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle('❌ JetPhotos Verification Failed')
          .setDescription(result.reason)
          .setFooter({ text: `${config.footerText} • Anti-Impersonation Check` });

        return interaction.editReply({ embeds: [failEmbed] });
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

      const successEmbed = new EmbedBuilder()
        .setColor(statusColor)
        .setTitle(statusTitle)
        .setDescription(
          `Congratulations ${member}! Your personal JetPhotos account ownership has been successfully authenticated.\n\n` +
          `**Authenticated Account Data:**\n` +
          `• 👤 **Photographer:** \`${result.username || 'JetPhotos User'}\`\n` +
          `• 📸 **Accepted Database Photos:** **${result.photoCount}** photos\n` +
          `• 📊 **Private Acceptance Rate:** **${result.acceptanceRate || 'Verified'}** *(Proof of Ownership)*\n\n` +
          roleDescription
        )
        .setFooter({ text: `${config.footerText} • Verified via Gemini AI Vision` })
        .setTimestamp();

      // If user unlocked JP Pro (150+ photos), announce in #chat or #jetphotos
      if (result.isPro) {
        const channels = await guild.channels.fetch();
        const jpChannel = channels.find(c => c && c.name.toLowerCase().includes('jetphotos')) ||
                          channels.find(c => c && c.name.toLowerCase().includes('chat') && !c.name.includes('staff'));

        if (jpChannel) {
          const announceEmbed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle('🏆 New JetPhotos PRO Spotter In the Server!')
            .setDescription(
              `Give it up for ${member} who just verified their JetPhotos portfolio with **${result.photoCount} accepted photos**!\n\n` +
              `🎖️ Role Awarded: **@${jetphotosService.JP_PRO_ROLE_NAME}**`
            )
            .setFooter({ text: `${config.footerText} • Congratulations!` })
            .setTimestamp();

          await jpChannel.send({ embeds: [announceEmbed] }).catch(() => {});
        }
      }

      return interaction.editReply({ embeds: [successEmbed] });
    } catch (err) {
      console.error('Error in /jetphotos-verify command:', err);
      return interaction.editReply({
        content: `${config.emojis.error} Verification processing failed: ${err.message}`
      });
    }
  }
};

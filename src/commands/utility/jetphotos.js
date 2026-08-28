const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
      const notVerifiedEmbed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('✈️ JetPhotos Status')
        .setDescription(
          `${targetUser} has not verified a personal JetPhotos account yet.\n\n` +
          `**Want to link your account?**\n` +
          `Use \`/jetphotos-verify\` with a screenshot of your personal dashboard to unlock your role!`
        )
        .setFooter({ text: config.footerText });

      return interaction.reply({ embeds: [notVerifiedEmbed] });
    }

    const isPro = profile.jp_photo_count >= 150;

    const embed = new EmbedBuilder()
      .setColor(isPro ? 0xF1C40F : 0x3498DB)
      .setAuthor({
        name: `${targetUser.tag}’s JetPhotos Profile`,
        iconURL: targetUser.displayAvatarURL({ dynamic: true })
      })
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        {
          name: '👤 Photographer Name',
          value: `\`${profile.jp_username || 'Verified User'}\``,
          inline: true
        },
        {
          name: '📸 Accepted Photos',
          value: `**${profile.jp_photo_count}** photos`,
          inline: true
        },
        {
          name: '📊 Acceptance Rate',
          value: `**${profile.jp_acceptance_rate || 'Verified'}**`,
          inline: true
        },
        {
          name: '🎖️ Current Tier',
          value: isPro ? '🏆 **JetPhotos PRO Spotter (150+)**' : '✈️ **JetPhotos Spotter**',
          inline: false
        },
        {
          name: '🗓️ Verified Since',
          value: profile.jp_verified_at ? `<t:${profile.jp_verified_at}:D>` : 'Recently',
          inline: true
        }
      )
      .setFooter({ text: `${config.footerText} • Authenticated via Gemini AI Vision` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};

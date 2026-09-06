const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');
const componentsV2 = require('../../utils/componentsV2');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Check your or another member’s server invite statistics')
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('The member whose invites you want to view (defaults to yourself)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const guild = interaction.guild;

    const stats = db.getMemberInvites(target.id, guild.id);
    const joinInfo = db.getInviterOf(target.id, guild.id);

    let inviterText = 'Direct / Vanity / Unknown';
    if (joinInfo && joinInfo.inviter_id) {
      if (joinInfo.inviter_id === 'VANITY_URL') {
        inviterText = 'Server Vanity URL';
      } else {
        inviterText = `<@${joinInfo.inviter_id}>`;
      }
    }

    const container = componentsV2.createContainer({
      accentColor: config.colors.primary,
      components: [
        componentsV2.createSection({
          text:
            `# 💌 Invite Statistics for ${target.username}\n\n` +
            `🏆 **Total Net Invites:** **${stats.total}**\n\n` +
            `### 📊 Detailed Breakdown\n` +
            `• ✅ **Regular (Active):** \`${stats.regular}\`\n` +
            `• ⛔ **Left Server:** \`${stats.left}\`\n` +
            `• 🤖 **Fake / Alts (<3d):** \`${stats.fake}\`\n` +
            `• 🎁 **Bonus Invites:** \`${stats.bonus}\`\n\n` +
            `📥 **Joined Via:** ${inviterText}\n` +
            `*Net formula: Regular + Bonus - Left - Fake*`,
          accessory: target.displayAvatarURL ? componentsV2.createThumbnail(target.displayAvatarURL({ dynamic: true })) : null
        })
      ]
    });

    return interaction.reply({
      flags: 32768,
      components: [container]
    });
  }
};

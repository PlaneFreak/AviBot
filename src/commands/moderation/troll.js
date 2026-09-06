const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
const trollTracker = require('../../data/trollTracker');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('troll')
    .setDescription('Playfully replies to all images posted by a user for 10 minutes with funny comments')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The user to activate the fun photo responder on')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('action')
        .setDescription('Action to perform (start or stop)')
        .addChoices(
          { name: 'Start (10 Minutes)', value: 'start' },
          { name: 'Stop', value: 'stop' }
        )
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const action = interaction.options.getString('action') || 'start';

    if (action === 'stop') {
      const removed = trollTracker.removeTroll(targetUser.id);
      const stopContainer = componentsV2.createContainer({
        accentColor: config.colors.primary,
        components: [
          componentsV2.createSection({
            text: `# 🛑 Fun Responder Deactivated\n\n` +
                  (removed
                    ? `Photo comments deactivated for **${targetUser.tag}**.\n\n`
                    : `**${targetUser.tag}** was not active in the responder.\n\n`) +
                  `*${config.footerText}*`
          })
        ]
      });
      return componentsV2.replyToInteraction(interaction, [stopContainer], { ephemeral: true });
    }

    const expiresAt = trollTracker.addTroll(targetUser.id, 10 * 60 * 1000); // 10 mins
    const expiresAtSeconds = Math.floor(expiresAt / 1000);

    const startContainer = componentsV2.createContainer({
      accentColor: config.colors.success,
      components: [
        componentsV2.createSection({
          text: `# 🎉 Fun Photo Responder Activated!\n\n` +
                `For the next **10 minutes** (<t:${expiresAtSeconds}:R>), every picture or image posted by **${targetUser.tag}** will receive a random funny aviation comment!\n\n` +
                `*To stop early, type \`?troll stop @user\` or use \`/troll target:@user action:Stop\`.*\n\n` +
                `*${config.footerText} • 10-Minute Timer Active*`
        })
      ]
    });

    await componentsV2.replyToInteraction(interaction, [startContainer], { ephemeral: true });
  }
};

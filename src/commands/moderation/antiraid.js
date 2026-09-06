const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
const antiRaidService = require('../../services/antiRaidService');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('Manage anti-raid security & emergency lockdown')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Check current anti-raid security status')
    )
    .addSubcommand(sub =>
      sub
        .setName('lockdown')
        .setDescription('Manually enable or disable emergency server lockdown')
        .addStringOption(opt =>
          opt
            .setName('state')
            .setDescription('Enable or disable lockdown')
            .setRequired(true)
            .addChoices(
              { name: '🔒 Enable Lockdown', value: 'enable' },
              { name: '🟢 Disable / Lift Lockdown', value: 'disable' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('reason')
            .setDescription('Reason for lockdown toggle')
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === 'status') {
      const stats = antiRaidService.getStatus(guild.id);
      const container = componentsV2.createContainer({
        accentColor: stats.isLockdownActive ? 0xE74C3C : config.colors.primary,
        components: [
          componentsV2.createSection({
            text: `# 🛡️ Anti-Raid Security Status\n\n` +
                  `**🔒 Lockdown Active**\n${stats.isLockdownActive ? '🚨 **YES (Active)**' : '🟢 **No (Normal)**'}\n\n` +
                  `**⚡ Join Trigger Window**\n**${stats.threshold} joins** / **${stats.windowSeconds}s**\n\n` +
                  `**🕒 Min Account Age**\n**${stats.minAccountAgeHours} hours**\n\n` +
                  `**📈 Recent Joins (10s)**\n**${stats.recentJoinCount}** joins detected\n\n` +
                  `*${config.footerText} • Emergency Raid Protection*`
          })
        ]
      });

      return componentsV2.replyToInteraction(interaction, [container], { ephemeral: true });
    }

    if (sub === 'lockdown') {
      const state = interaction.options.getString('state');
      const reason = interaction.options.getString('reason') || `Manual trigger by ${interaction.user.tag}`;

      if (state === 'enable') {
        await antiRaidService.activateLockdown(guild, reason);
        return interaction.reply({
          content: `🚨 **Server Lockdown ACTIVATED!** (${reason})`,
          flags: 64
        });
      } else {
        await antiRaidService.liftLockdown(guild, `Staff Override (${interaction.user.tag})`);
        return interaction.reply({
          content: `🟢 **Server Lockdown LIFTED!** Normal server operations restored.`,
          flags: 64
        });
      }
    }
  }
};

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
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
      const stats = antiRaidService.getStatus();
      const embed = new EmbedBuilder()
        .setColor(stats.isLockdownActive ? 0xE74C3C : config.colors.primary)
        .setTitle('🛡️ Anti-Raid Security Status')
        .addFields(
          {
            name: '🔒 Lockdown Active',
            value: stats.isLockdownActive ? '🚨 **YES (Active)**' : '🟢 **No (Normal)**',
            inline: true
          },
          {
            name: '⚡ Join Trigger Window',
            value: `**${stats.threshold} joins** / **${stats.windowSeconds}s**`,
            inline: true
          },
          {
            name: '🕒 Min Account Age',
            value: `**${stats.minAccountAgeHours} hours**`,
            inline: true
          },
          {
            name: '📈 Recent Joins (10s)',
            value: `**${stats.recentJoinCount}** joins detected`,
            inline: true
          }
        )
        .setFooter({ text: `${config.footerText} • Emergency Raid Protection` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: 64 });
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

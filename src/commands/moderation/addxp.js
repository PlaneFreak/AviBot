const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const levelHelper = require('../../utils/levelHelper');
const componentsV2 = require('../../utils/componentsV2');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addxp')
    .setDescription('Add Spotter XP or Chat Activity XP to a server member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('The member to receive XP')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName('amount')
        .setDescription('Amount of XP to add (must be greater than 0)')
        .setMinValue(1)
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('type')
        .setDescription('XP category (Spotter XP or Chat Activity XP)')
        .setRequired(false)
        .addChoices(
          { name: '📸 Spotter XP (Default)', value: 'spotter' },
          { name: '💬 Chat Activity XP', value: 'chat' }
        )
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const type = interaction.options.getString('type') || 'spotter';

    if (amount <= 0) {
      return interaction.reply({
        content: '❌ Amount of XP must be greater than 0.',
        flags: 64
      });
    }

    let totalXP = 0;
    let newLevel = 1;
    let rankTitle = '';
    let progressBar = '';
    let categoryName = '';

    if (type === 'chat') {
      const result = db.addChatXP(target.id, interaction.guild.id, amount);
      totalXP = result.totalChatXP;
      newLevel = result.newLevel;
      rankTitle = result.levelData.rankTitle;
      progressBar = result.levelData.progressBar;
      categoryName = '💬 Chat Activity XP';
    } else {
      const result = db.addXP(target.id, interaction.guild.id, amount);
      totalXP = result.totalXP;
      newLevel = result.newLevel;
      const levelData = levelHelper.calculateLevelData(totalXP);
      rankTitle = levelData.rankTitle;
      progressBar = levelData.progressBar;
      categoryName = '📸 Spotter XP';
    }

    const container = componentsV2.createContainer({
      accentColor: config.colors.primary,
      components: [
        componentsV2.createSection({
          text:
            `# ✨ XP Successfully Awarded\n\n` +
            `**Recipient:** ${target} (\`${target.tag}\`)\n` +
            `**Amount Added:** **+${amount.toLocaleString()} XP** (${categoryName})\n` +
            `**New Total XP:** **${totalXP.toLocaleString()} XP**\n` +
            `**Current Level:** **Level ${newLevel}** — *${rankTitle}*\n` +
            `**Progress:** \`${progressBar}\`\n\n` +
            `*Awarded by ${interaction.user}*`,
          accessory: target.displayAvatarURL ? componentsV2.createThumbnail(target.displayAvatarURL({ dynamic: true })) : null
        })
      ]
    });

    await componentsV2.sendToChannel(interaction.client, interaction.channel.id, [container]);

    return interaction.reply({
      content: `✅ Successfully awarded **+${amount.toLocaleString()} XP** to **${target.tag}**!`,
      flags: 64
    });
  }
};

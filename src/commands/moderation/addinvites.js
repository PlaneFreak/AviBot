const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const componentsV2 = require('../../utils/componentsV2');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addinvites')
    .setDescription('Add or remove bonus invites for a server member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('The member to receive bonus invites')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName('amount')
        .setDescription('Amount of bonus invites to add (use negative number to subtract)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('reason')
        .setDescription('Reason for granting or removing bonus invites')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const guild = interaction.guild;

    const updated = db.addBonusInvites(target.id, guild.id, amount);

    const container = componentsV2.createContainer({
      accentColor: config.colors.primary,
      components: [
        componentsV2.createSection({
          text:
            `# 🎁 Bonus Invites Adjusted\n\n` +
            `**Member:** ${target} (\`${target.tag}\`)\n` +
            `**Adjustment:** **${amount > 0 ? `+${amount}` : amount} Bonus Invites**\n` +
            `**Updated Net Total:** **${updated.total} Invites** *(🎁 Total Bonus: ${updated.bonus})*\n` +
            `**Reason:** *${reason}*\n\n` +
            `*Adjusted by ${interaction.user}*`,
          accessory: target.displayAvatarURL ? componentsV2.createThumbnail(target.displayAvatarURL({ dynamic: true })) : null
        })
      ]
    });

    await componentsV2.sendToChannel(interaction.client, interaction.channel.id, [container]);

    return interaction.reply({
      content: `✅ Successfully adjusted bonus invites for **${target.tag}**!`,
      flags: 64
    });
  }
};

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-verify')
    .setDescription('Posts the official server verification message with a Verify button')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Channel to post the verification embed in (defaults to current channel)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('Role to grant upon verification (defaults to Aviator role)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    const specifiedRole = interaction.options.getRole('role');

    const defaultRole = specifiedRole || interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'aviator' || r.name.toLowerCase() === 'member');

    const verifyEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🛫 Welcome & Server Verification')
      .setDescription(
        `Welcome to **${interaction.guild.name}**!\n\n` +
        'To gain full access to all channels, photo sharing, and voice lounges, please click the **Verify & Enter** button below.\n\n' +
        '**Before verifying, please ensure you have read our server rules in `#📜ㆍrules`.**'
      )
      .addFields(
        {
          name: '🛡️ Member Access',
          value: defaultRole ? `Grants the **@${defaultRole.name}** role automatically.` : 'Grants full server access.',
          inline: false
        }
      )
      .setFooter({ text: `${config.footerText} • 1-Click Verification` })
      .setTimestamp();

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`verify_member_${defaultRole ? defaultRole.id : 'auto'}`)
        .setLabel('Verify & Enter')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
    );

    await targetChannel.send({ embeds: [verifyEmbed], components: [buttonRow] });

    const replyEmbed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle(`${config.emojis.success} Verification Panel Created`)
      .setDescription(`The verification panel was successfully published to ${targetChannel}.`)
      .setFooter({ text: config.footerText });

    await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
  }
};

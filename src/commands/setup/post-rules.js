const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const config = require('../../config');
const serverTemplate = require('../../templates/serverTemplate');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('post-rules')
    .setDescription('Posts the official server rules embed into a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Channel to post the rules in (defaults to current channel)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    const rulesData = serverTemplate.rulesContent;

    const rulesEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(rulesData.title)
      .setDescription(rulesData.description)
      .addFields(rulesData.fields)
      .setFooter({ text: `${rulesData.footer} • ${config.footerText}` })
      .setTimestamp();

    await targetChannel.send({ embeds: [rulesEmbed] });

    const replyEmbed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle(`${config.emojis.success} Rules Successfully Posted`)
      .setDescription(`The server rules embed was published to ${targetChannel}.`)
      .setFooter({ text: config.footerText });

    await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
  }
};

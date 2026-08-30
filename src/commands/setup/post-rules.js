const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
const config = require('../../config');
const serverTemplate = require('../../templates/serverTemplate');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('post-rules')
    .setDescription('Posts the official server rules using Components V2')
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

    let rulesMarkdown = `# ${rulesData.title}\n\n${rulesData.description}\n\n`;
    for (const field of rulesData.fields) {
      rulesMarkdown += `### ${field.name}\n${field.value}\n\n`;
    }
    rulesMarkdown += `*${rulesData.footer}*`;

    const container = componentsV2.createContainer({
      accentColor: config.colors.primary,
      components: [
        componentsV2.createSection({
          text: rulesMarkdown.trim(),
          accessory: componentsV2.createThumbnail('https://cdn-icons-png.flaticon.com/512/3500/3500833.png')
        })
      ]
    });

    await componentsV2.sendToChannel(interaction.client, targetChannel.id, [container]);

    return interaction.reply({
      content: `✅ Server rules successfully published to ${targetChannel} using Components V2!`,
      flags: 64
    });
  }
};

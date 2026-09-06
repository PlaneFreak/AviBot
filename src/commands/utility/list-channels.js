const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder, ChannelType } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-channels')
    .setDescription('Lists all channels with their names and IDs in format: "channel-name" | id')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false)
    .addBooleanOption(option =>
      option
        .setName('as-file')
        .setDescription('Receive the list as a downloadable .txt file')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const guild = interaction.guild;
    const asFile = interaction.options.getBoolean('as-file') || false;

    // Fetch all channels
    const channels = await guild.channels.fetch();

    // Sort channels by position
    const sortedChannels = [...channels.values()]
      .filter(ch => ch !== null)
      .sort((a, b) => {
        // Group categories first or by rawPosition
        return (a.rawPosition || 0) - (b.rawPosition || 0);
      });

    // Format output: "channel-name" | id
    const lines = [];
    const formattedList = [];

    // Separate into Categories and their child channels
    const categories = sortedChannels.filter(c => c.type === ChannelType.GuildCategory);
    const uncategorized = sortedChannels.filter(c => !c.parentId && c.type !== ChannelType.GuildCategory);

    if (uncategorized.length > 0) {
      lines.push(`=== UNCATEGORIZED ===`);
      for (const ch of uncategorized) {
        const line = `"${ch.name}" | ${ch.id}`;
        lines.push(line);
        formattedList.push(line);
      }
      lines.push('');
    }

    for (const cat of categories) {
      const catLine = `📂 [CATEGORY] "${cat.name}" | ${cat.id}`;
      lines.push(catLine);
      formattedList.push(`"${cat.name}" | ${cat.id}`);

      const children = sortedChannels.filter(c => c.parentId === cat.id);
      for (const ch of children) {
        const typeSymbol = ch.type === ChannelType.GuildVoice ? '🔊' : ch.type === ChannelType.GuildAnnouncement ? '📢' : '#';
        const line = `  ${typeSymbol} "${ch.name}" | ${ch.id}`;
        lines.push(line);
        formattedList.push(`"${ch.name}" | ${ch.id}`);
      }
      lines.push('');
    }

    const fullTextOutput = formattedList.join('\n');
    const displayOutput = lines.join('\n');

    if (asFile || displayOutput.length > 3900) {
      const buffer = Buffer.from(fullTextOutput, 'utf-8');
      const attachment = new AttachmentBuilder(buffer, { name: `${guild.name.replace(/[^a-zA-Z0-9]/g, '_')}_channels.txt` });

      const mdText = `# ${config.emojis.channel} Server Channel List\n\nFound **${channels.size}** total channels in **${guild.name}**.\nThe full list has been attached as a text file for easy reading.\n\n*${config.footerText}* <t:${Math.floor(Date.now() / 1000)}:R>`;
      
      const fileContainer = componentsV2.createContainer({
        accentColor: config.colors.primary,
        components: [
          componentsV2.createSection({ text: mdText })
        ]
      });

      return interaction.editReply({ components: [fileContainer], flags: 32768, files: [attachment] });
    }

    // Embed formatting if it fits
    const mdText = `# ${config.emojis.channel} Server Channel List (${channels.size} Channels)\n\n\`\`\`text\n${displayOutput.slice(0, 3900)}\`\`\`\n\n*${config.footerText}* <t:${Math.floor(Date.now() / 1000)}:R>`;
    
    const container = componentsV2.createContainer({
      accentColor: config.colors.primary,
      components: [
        componentsV2.createSection({ text: mdText })
      ]
    });

    await componentsV2.editInteractionReply(interaction, [container]);
  }
};

const { SlashCommandBuilder, ChannelType, GuildVerificationLevel } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server-info')
    .setDescription('Displays detailed information and statistics about this server')
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply();

    const guild = interaction.guild;
    const owner = await guild.fetchOwner().catch(() => null);

    // Fetch members and channels to ensure accurate counts
    const members = await guild.members.fetch().catch(() => guild.members.cache);
    const channels = await guild.channels.fetch().catch(() => guild.channels.cache);

    const totalMembers = guild.memberCount;
    const humanCount = members.filter(m => !m.user.bot).size;
    const botCount = members.filter(m => m.user.bot).size;

    const textChannels = channels.filter(c => c && (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)).size;
    const voiceChannels = channels.filter(c => c && (c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice)).size;
    const categoryCount = channels.filter(c => c && c.type === ChannelType.GuildCategory).size;

    const rolesCount = guild.roles.cache.size - 1; // Exclude @everyone
    const emojisCount = guild.emojis.cache.size;
    const stickersCount = guild.stickers.cache.size;

    const boostLevel = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount || 0;

    const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);

    const verificationLevels = {
      0: 'None',
      1: 'Low (Verified Email)',
      2: 'Medium (Registered >5m)',
      3: 'High (Member >10m)',
      4: 'Highest (Verified Phone)'
    };

    let mdText = `# ℹ️ ${guild.name} • Server Information\n\n`;
    
    mdText += `**👑 Ownership & Basics**\n`;
    mdText += `• **Server ID:** \`${guild.id}\`\n`;
    mdText += `• **Owner:** ${owner ? `${owner.user.tag} (\`${owner.id}\`)` : 'Unknown'}\n`;
    mdText += `• **Created:** <t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)\n`;
    mdText += `• **Verification:** \`${verificationLevels[guild.verificationLevel] || 'Unknown'}\`\n\n`;
    
    mdText += `**👥 Members (${totalMembers})**\n`;
    mdText += `• **Humans:** \`${humanCount}\`\n`;
    mdText += `• **Bots:** \`${botCount}\`\n\n`;
    
    mdText += `**📁 Channels (${channels.size})**\n`;
    mdText += `• **Text:** \`${textChannels}\`\n`;
    mdText += `• **Voice:** \`${voiceChannels}\`\n`;
    mdText += `• **Categories:** \`${categoryCount}\`\n\n`;
    
    mdText += `**🚀 Nitro & Customization**\n`;
    mdText += `• **Boost Level:** \`Tier ${boostLevel}\`\n`;
    mdText += `• **Boosts:** \`${boostCount}\` boosts\n`;
    mdText += `• **Roles:** \`${rolesCount}\`\n`;
    mdText += `• **Emojis & Stickers:** \`${emojisCount}\` / \`${stickersCount}\`\n\n`;
    
    mdText += `*${config.footerText}* <t:${Math.floor(Date.now() / 1000)}:R>`;

    const components = [];
    
    if (guild.bannerURL()) {
      components.push(componentsV2.createMediaGallery([guild.bannerURL({ size: 1024 })]));
    }
    
    components.push(
      componentsV2.createSection({
        text: mdText,
        accessory: componentsV2.createThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
      })
    );

    const container = componentsV2.createContainer({
      accentColor: config.colors.primary,
      components: components
    });

    await componentsV2.editInteractionReply(interaction, [container]);
  }
};

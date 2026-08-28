const { SlashCommandBuilder, EmbedBuilder, ChannelType, GuildVerificationLevel } = require('discord.js');
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

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`ℹ️ ${guild.name} • Server Information`)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
      .addFields(
        {
          name: '👑 Ownership & Basics',
          value: [
            `• **Server ID:** \`${guild.id}\``,
            `• **Owner:** ${owner ? `${owner.user.tag} (\`${owner.id}\`)` : 'Unknown'}`,
            `• **Created:** <t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)`,
            `• **Verification:** \`${verificationLevels[guild.verificationLevel] || 'Unknown'}\``
          ].join('\n'),
          inline: false
        },
        {
          name: `👥 Members (${totalMembers})`,
          value: [
            `• **Humans:** \`${humanCount}\``,
            `• **Bots:** \`${botCount}\``
          ].join('\n'),
          inline: true
        },
        {
          name: `📁 Channels (${channels.size})`,
          value: [
            `• **Text:** \`${textChannels}\``,
            `• **Voice:** \`${voiceChannels}\``,
            `• **Categories:** \`${categoryCount}\``
          ].join('\n'),
          inline: true
        },
        {
          name: '🚀 Nitro & Customization',
          value: [
            `• **Boost Level:** \`Tier ${boostLevel}\``,
            `• **Boosts:** \`${boostCount}\` boosts`,
            `• **Roles:** \`${rolesCount}\``,
            `• **Emojis & Stickers:** \`${emojisCount}\` / \`${stickersCount}\``
          ].join('\n'),
          inline: true
        }
      )
      .setFooter({ text: config.footerText })
      .setTimestamp();

    if (guild.bannerURL()) {
      embed.setImage(guild.bannerURL({ size: 1024 }));
    }

    await interaction.editReply({ embeds: [embed] });
  }
};

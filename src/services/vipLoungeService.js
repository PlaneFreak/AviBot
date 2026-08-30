const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config');

const VIP_CATEGORY_NAME = '⭐ ┃ VIP LOUNGE';
const VIP_CHANNEL_NAME = '🍸ㆍvip-general';
const VIP_VOICE_NAME = '🔊ㆍVIP Lounge';

module.exports = {
  VIP_CATEGORY_NAME,
  VIP_CHANNEL_NAME,
  VIP_VOICE_NAME,

  /**
   * Ensures the exclusive VIP category, VIP text channel, and VIP voice channel exist
   */
  async ensureVipCategoryAndChannels(guild) {
    try {
      const channels = await guild.channels.fetch();
      const roles = await guild.roles.fetch();

      const vipRole = roles.find(r => r.name === '⭐ㆍVIP' || r.name.toLowerCase() === 'vip');
      const everyoneRole = guild.roles.everyone;
      const verifiedRole = roles.find(r => r.name.toLowerCase().includes('verified'));
      const adminRole = roles.find(r => r.name.toLowerCase() === 'admin');
      const modRole = roles.find(r => r.name.toLowerCase() === 'moderator');

      // Category Overwrites: Strictly hidden from everyone except VIP and Staff
      const categoryOverwrites = [
        {
          id: everyoneRole.id,
          deny: [PermissionFlagsBits.ViewChannel]
        }
      ];

      if (verifiedRole) {
        categoryOverwrites.push({
          id: verifiedRole.id,
          deny: [PermissionFlagsBits.ViewChannel]
        });
      }

      if (vipRole) {
        categoryOverwrites.push({
          id: vipRole.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.AddReactions,
            PermissionFlagsBits.UseExternalEmojis,
            PermissionFlagsBits.UseExternalStickers,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak
          ]
        });
      }

      if (modRole) {
        categoryOverwrites.push({
          id: modRole.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory
          ]
        });
      }

      if (adminRole) {
        categoryOverwrites.push({
          id: adminRole.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory
          ]
        });
      }

      // 1. Find or create VIP Category
      let category = channels.find(
        c => c && c.type === ChannelType.GuildCategory && (c.name === VIP_CATEGORY_NAME || c.name.toLowerCase().includes('vip'))
      );

      if (!category) {
        category = await guild.channels.create({
          name: VIP_CATEGORY_NAME,
          type: ChannelType.GuildCategory,
          permissionOverwrites: categoryOverwrites,
          reason: 'Auto-creation of VIP Lounge Category'
        });
        console.log(`⭐ Created VIP Lounge Category in ${guild.name}`);
      } else {
        // Sync Category Permissions
        await category.permissionOverwrites.set(categoryOverwrites).catch(() => {});
      }

      // 2. Find or create 🍸ㆍvip-general
      let vipTextChannel = channels.find(
        c => c && c.type === ChannelType.GuildText && (c.name === VIP_CHANNEL_NAME || (c.parentId === category.id && c.name.toLowerCase().includes('general')))
      );

      if (!vipTextChannel) {
        vipTextChannel = await guild.channels.create({
          name: VIP_CHANNEL_NAME,
          type: ChannelType.GuildText,
          parent: category.id,
          topic: '🍸 Private exclusive lounge for ⭐ VIP members and community supporters.',
          permissionOverwrites: categoryOverwrites,
          reason: 'Auto-creation of VIP General channel'
        });
        console.log(`🍸 Created #${vipTextChannel.name} in VIP category`);

        // Post welcome banner embed
        const welcomeEmbed = new EmbedBuilder()
          .setColor(0xF1C40F)
          .setTitle('🍸 Welcome to the Exclusive VIP Lounge')
          .setDescription(
            `### ⭐ Welcome to your Private Salon!\n\n` +
            `This channel is an exclusive hangout space reserved entirely for our **⭐ VIP members**, server supporters, and staff.\n\n` +
            `**VIP Perks in this channel:**\n` +
            `• 💬 **Relaxed, private conversation atmosphere**\n` +
            `• 📎 **Direct media, attachment & external emoji access**\n` +
            `• 🎙️ **Priority voice channel access in 🔊ㆍVIP Lounge**\n\n` +
            `*Enjoy your stay and thank you for supporting the community!*`
          )
          .setFooter({ text: `${config.footerText} • VIP Exclusive Lounge` })
          .setTimestamp();

        await vipTextChannel.send({ embeds: [welcomeEmbed] }).catch(() => {});
      }

      // 3. Find or create 🔊ㆍVIP Lounge (Voice)
      let vipVoiceChannel = channels.find(
        c => c && c.type === ChannelType.GuildVoice && (c.name === VIP_VOICE_NAME || (c.parentId === category.id && c.name.toLowerCase().includes('vip')))
      );

      if (!vipVoiceChannel) {
        vipVoiceChannel = await guild.channels.create({
          name: VIP_VOICE_NAME,
          type: ChannelType.GuildVoice,
          parent: category.id,
          bitrate: Math.min(384000, guild.maximumBitrate || 96000),
          permissionOverwrites: categoryOverwrites,
          reason: 'Auto-creation of VIP Voice channel'
        });
        console.log(`🔊 Created VIP Voice Channel #${vipVoiceChannel.name}`);
      }

      return { category, vipTextChannel, vipVoiceChannel };
    } catch (err) {
      console.error('Error ensuring VIP Lounge category and channels:', err);
      return null;
    }
  }
};

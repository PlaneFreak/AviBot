const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const config = require('../config');

const APPEALS_CHANNEL_NAME = '⚖️ㆍappeals';

module.exports = {
  APPEALS_CHANNEL_NAME,

  /**
   * Generates the "Submit Appeal" button for DMs
   */
  createAppealButton(guildId, punishmentType) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`appeal_open_${guildId}_${punishmentType}`)
        .setLabel('Submit Appeal')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📝')
    );
  },

  /**
   * Generates Action Row for Jail Channel with Appeal & Chat Activate buttons
   */
  createJailActionRow(guildId, punishmentType, userId) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`appeal_open_${guildId}_${punishmentType}`)
        .setLabel('Submit Appeal')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📝'),
      new ButtonBuilder()
        .setCustomId(`jail_chat_activate_${userId}`)
        .setLabel('Chat Activate')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('💬')
    );
  },

  /**
   * Generates the Appeal Modal
   */
  createAppealModal(guildId, punishmentType) {
    const modal = new ModalBuilder()
      .setCustomId(`appeal_submit_${guildId}_${punishmentType}`)
      .setTitle(`Appeal ${punishmentType.toUpperCase()}`);

    const reasonInput = new TextInputBuilder()
      .setCustomId('appeal_reason')
      .setLabel('Why should your punishment be lifted?')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Explain why you believe the action should be reversed or why it was a misunderstanding.')
      .setMinLength(5)
      .setMaxLength(1000)
      .setRequired(true);

    const contextInput = new TextInputBuilder()
      .setCustomId('appeal_context')
      .setLabel('Additional context, explanation, or apology')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Provide any extra details, remorse, or commitments for the future.')
      .setMaxLength(1000)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(reasonInput),
      new ActionRowBuilder().addComponents(contextInput)
    );

    return modal;
  },

  /**
   * Finds or creates the ⚖️ㆍappeals channel with staff permissions
   */
  async getOrCreateAppealsChannel(guild) {
    // 1. Try to find existing channel
    const channels = await guild.channels.fetch();
    let appealsChannel = channels.find(
      c => c && (c.name === APPEALS_CHANNEL_NAME || c.name.toLowerCase().includes('appeals')) && c.type === ChannelType.GuildText
    );

    if (appealsChannel) return appealsChannel;

    // 2. Find Staff category or create one
    let staffCategory = channels.find(
      c => c && c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('staff')
    );

    const adminRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'admin');
    const modRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'moderator');
    const everyoneRole = guild.roles.everyone;

    const staffOverwrites = [
      {
        id: everyoneRole.id,
        deny: [PermissionFlagsBits.ViewChannel]
      }
    ];

    if (modRole) {
      staffOverwrites.push({
        id: modRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.EmbedLinks
        ]
      });
    }

    if (adminRole) {
      staffOverwrites.push({
        id: adminRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.EmbedLinks
        ]
      });
    }

    if (!staffCategory) {
      staffCategory = await guild.channels.create({
        name: 'Staff',
        type: ChannelType.GuildCategory,
        permissionOverwrites: staffOverwrites,
        reason: 'Staff category auto-creation for appeals'
      });
    }

    // 3. Create appeals channel inside staff category
    appealsChannel = await guild.channels.create({
      name: APPEALS_CHANNEL_NAME,
      type: ChannelType.GuildText,
      parent: staffCategory.id,
      topic: 'Incoming user punishment appeals (Bans, Kicks, Timeouts) for review.',
      permissionOverwrites: staffOverwrites,
      reason: 'Appeals channel auto-creation'
    });

    return appealsChannel;
  },

  /**
   * Creates the Staff Action Row for accepting or rejecting the appeal
   */
  createAppealStaffRow(guildId, userId, punishmentType) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`appeal_accept_${guildId}_${userId}_${punishmentType}`)
        .setLabel('Accept Appeal')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId(`appeal_reject_${guildId}_${userId}_${punishmentType}`)
        .setLabel('Reject Appeal')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌')
    );
  }
};

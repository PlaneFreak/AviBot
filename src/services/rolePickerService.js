const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

const ROLES_CHANNEL_NAME = '🎨ㆍroles';

const ROLE_CATEGORIES = {
  age: {
    name: 'Age Group',
    customId: 'select_role_age',
    placeholder: '🔞 Select your age group...',
    exclusive: true,
    roles: [
      { id: '18_minus', name: '🔞ㆍUnder 18', emoji: '🐣', color: 0x3498DB, description: 'Under 18 years old' },
      { id: '18_plus', name: '🔞ㆍ18+', emoji: '🔞', color: 0x9B59B6, description: '18 years or older' }
    ]
  },
  passion: {
    name: 'Aviation Identity & Passion',
    customId: 'select_role_passion',
    placeholder: '✈️ Select your aviation identity...',
    exclusive: false,
    roles: [
      { id: 'spotter', name: '📸ㆍPlanespotter', emoji: '📸', color: 0xF1C40F, description: 'Active airport spotter & aviation photographer' },
      { id: 'enthusiast', name: '✈️ㆍAviation Enthusiast', emoji: '✈️', color: 0x3498DB, description: 'Loves aircraft & aviation, but not an active spotter' },
      { id: 'pilot', name: '👨‍✈️ㆍReal-World Pilot', emoji: '👨‍✈️', color: 0x2ECC71, description: 'Holds a PPL / CPL / ATPL or student pilot' },
      { id: 'flightsim', name: '🕹️ㆍFlight Simmer', emoji: '🕹️', color: 0xE67E22, description: 'MSFS, X-Plane, Prepar3D, DCS pilot' }
    ]
  },
  camera: {
    name: 'Camera Brand',
    customId: 'select_role_camera',
    placeholder: '📷 Select your camera brand(s)...',
    exclusive: false,
    roles: [
      { id: 'sony_cam', name: '📷ㆍSony', emoji: '🟠', color: 0x95A5A6, description: 'Sony Alpha (A7, A9, A1, A6700, etc.)' },
      { id: 'canon_cam', name: '📷ㆍCanon', emoji: '🔴', color: 0x95A5A6, description: 'Canon EOS (R5, R6, R7, 90D, 1DX, etc.)' },
      { id: 'nikon_cam', name: '📷ㆍNikon', emoji: '🟡', color: 0x95A5A6, description: 'Nikon Z / D (Z8, Z9, Z6, D500, D850, etc.)' },
      { id: 'fuji_cam', name: '📷ㆍFujifilm', emoji: '🟢', color: 0x95A5A6, description: 'Fujifilm X / GFX series' },
      { id: 'lumix_cam', name: '📷ㆍPanasonic Lumix', emoji: '🔵', color: 0x95A5A6, description: 'Panasonic Lumix S / G cameras' },
      { id: 'olympus_cam', name: '📷ㆍOM System / Olympus', emoji: '⚪', color: 0x95A5A6, description: 'OM System / Olympus OM-D' },
      { id: 'phone_cam', name: '📱ㆍSmartphone Spotter', emoji: '📱', color: 0x95A5A6, description: 'iPhone, Samsung, Google Pixel spotting' },
      { id: 'other_cam', name: '📷ㆍOther Camera', emoji: '📷', color: 0x95A5A6, description: 'Leica, Pentax, or other cameras' }
    ]
  },
  lens: {
    name: 'Lens Brand',
    customId: 'select_role_lens',
    placeholder: '🔭 Select your lens brand(s)...',
    exclusive: false,
    roles: [
      { id: 'sony_lens', name: '🔭ㆍSony G / GM', emoji: '🟠', color: 0x7F8C8D, description: 'Sony G Master / G telephoto lenses' },
      { id: 'canon_lens', name: '🔭ㆍCanon L / RF', emoji: '🔴', color: 0x7F8C8D, description: 'Canon L-Series / RF / EF telephotos' },
      { id: 'nikon_lens', name: '🔭ㆍNikkor / Nikon', emoji: '🟡', color: 0x7F8C8D, description: 'Nikkor Z & F mount telephoto lenses' },
      { id: 'sigma_lens', name: '🔭ㆍSigma', emoji: '⚫', color: 0x7F8C8D, description: 'Sigma Contemporary / Sports (150-600, 60-600, etc.)' },
      { id: 'tamron_lens', name: '🔭ㆍTamron', emoji: '🔵', color: 0x7F8C8D, description: 'Tamron 150-500, 70-300, 50-400, etc.' },
      { id: 'samyang_lens', name: '🔭ㆍSamyang / Rokinon', emoji: '⚪', color: 0x7F8C8D, description: 'Samyang / Rokinon prime & zoom lenses' },
      { id: 'other_lens', name: '🔭ㆍOther / Kit Lens', emoji: '🔭', color: 0x7F8C8D, description: 'Kit telephotos & other glass' }
    ]
  },
  continent: {
    name: 'Home Continent',
    customId: 'select_role_continent',
    placeholder: '🌍 Select your home continent...',
    exclusive: true,
    roles: [
      { id: 'europe', name: '🌍ㆍEurope', emoji: '🇪🇺', color: 0x2980B9, description: 'Spotting in Europe' },
      { id: 'north_america', name: '🌎ㆍNorth America', emoji: '🇺🇸', color: 0x27AE60, description: 'Spotting in North America (USA, Canada, Mexico)' },
      { id: 'south_america', name: '🌎ㆍSouth America', emoji: '🇧🇷', color: 0xF39C12, description: 'Spotting in South America' },
      { id: 'asia', name: '🌏ㆍAsia', emoji: '🇯🇵', color: 0xC0392B, description: 'Spotting in Asia' },
      { id: 'africa', name: '🌍ㆍAfrica', emoji: '🇿🇦', color: 0x8E44AD, description: 'Spotting in Africa' },
      { id: 'oceania', name: '🌏ㆍOceania', emoji: '🇦🇺', color: 0x16A085, description: 'Spotting in Australia, New Zealand & Pacific' }
    ]
  }
};

module.exports = {
  ROLES_CHANNEL_NAME,
  ROLE_CATEGORIES,

  /**
   * Ensures all roles exist on the guild
   */
  async ensureRolesExist(guild) {
    const existingRoles = await guild.roles.fetch();
    const createdMap = new Map();

    for (const cat of Object.values(ROLE_CATEGORIES)) {
      for (const rDef of cat.roles) {
        let role = existingRoles.find(r => r.name.toLowerCase() === rDef.name.toLowerCase());
        if (!role) {
          role = await guild.roles.create({
            name: rDef.name,
            color: rDef.color,
            hoist: false,
            permissions: [],
            reason: `Auto-creation of role picker role: ${rDef.name}`
          }).catch(err => {
            console.error(`Failed to create role ${rDef.name}:`, err.message);
            return null;
          });
        }
        if (role) {
          createdMap.set(rDef.id, role);
        }
      }
    }

    return createdMap;
  },

  /**
   * Finds or creates the #🎨ㆍroles channel
   */
  async getOrCreateRolesChannel(guild) {
    const channels = await guild.channels.fetch();
    let channel = channels.find(
      c => c && c.type === ChannelType.GuildText && (c.name === ROLES_CHANNEL_NAME || c.name.toLowerCase().includes('roles'))
    );

    const verifiedRole = guild.roles.cache.find(r => r.name.toLowerCase().includes('verified'));
    const everyoneRole = guild.roles.everyone;

    const category = channels.find(
      c => c && c.type === ChannelType.GuildCategory && (c.name.toLowerCase().includes('important') || c.name.toLowerCase().includes('welcome'))
    );

    const overwrites = [
      {
        id: everyoneRole.id,
        deny: [PermissionFlagsBits.ViewChannel] // Hidden to unverified
      }
    ];

    if (verifiedRole) {
      overwrites.push({
        id: verifiedRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
        deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.CreatePublicThreads]
      });
    }

    if (!channel) {
      channel = await guild.channels.create({
        name: ROLES_CHANNEL_NAME,
        type: ChannelType.GuildText,
        parent: category ? category.id : null,
        topic: 'Select your personal roles: Age, Camera Gear, Lenses, Continent, and Aviation Identity.',
        permissionOverwrites: overwrites,
        reason: 'Auto-creation of roles channel'
      });
    }

    return channel;
  },

  /**
   * Publishes the interactive role picker panels in #🎨ㆍroles
   */
  async publishRolePicker(guild) {
    const channel = await this.getOrCreateRolesChannel(guild);
    await this.ensureRolesExist(guild);

    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    const hasPanel = messages && messages.some(m => m.author.id === guild.client.user.id && m.embeds.length > 0);

    // If already posted, skip to avoid spam
    if (hasPanel) return;

    // Panel 1: Identity & Age & Continent
    const embed1 = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🎨 Spotter Profile & Community Roles')
      .setDescription(
        `Customize your spotter profile! Choose your **Age Group**, **Aviation Passion**, and **Home Continent** below to receive specialty badges and connect with local spotters.`
      )
      .addFields(
        {
          name: '1️⃣ Age Group',
          value: '`🔞ㆍUnder 18` or `🔞ㆍ18+`',
          inline: true
        },
        {
          name: '2️⃣ Aviation Identity',
          value: '`📸ㆍPlanespotter`, `✈️ㆍEnthusiast`, `👨‍✈️ㆍPilot`, `🕹️ㆍSimmer`',
          inline: true
        },
        {
          name: '3️⃣ Home Continent',
          value: '`🌍 Europe`, `🌎 North America`, `🌏 Asia`, etc.',
          inline: false
        }
      )
      .setFooter({ text: `${config.footerText} • Select your roles from the dropdowns below!` });

    const ageSelect = new StringSelectMenuBuilder()
      .setCustomId('select_role_age')
      .setPlaceholder(ROLE_CATEGORIES.age.placeholder)
      .setMinValues(0)
      .setMaxValues(1)
      .addOptions(
        ROLE_CATEGORIES.age.roles.map(r =>
          new StringSelectMenuOptionBuilder()
            .setLabel(r.name)
            .setValue(r.id)
            .setDescription(r.description)
            .setEmoji(r.emoji)
        )
      );

    const passionSelect = new StringSelectMenuBuilder()
      .setCustomId('select_role_passion')
      .setPlaceholder(ROLE_CATEGORIES.passion.placeholder)
      .setMinValues(0)
      .setMaxValues(ROLE_CATEGORIES.passion.roles.length)
      .addOptions(
        ROLE_CATEGORIES.passion.roles.map(r =>
          new StringSelectMenuOptionBuilder()
            .setLabel(r.name)
            .setValue(r.id)
            .setDescription(r.description)
            .setEmoji(r.emoji)
        )
      );

    const continentSelect = new StringSelectMenuBuilder()
      .setCustomId('select_role_continent')
      .setPlaceholder(ROLE_CATEGORIES.continent.placeholder)
      .setMinValues(0)
      .setMaxValues(1)
      .addOptions(
        ROLE_CATEGORIES.continent.roles.map(r =>
          new StringSelectMenuOptionBuilder()
            .setLabel(r.name)
            .setValue(r.id)
            .setDescription(r.description)
            .setEmoji(r.emoji)
        )
      );

    await channel.send({
      embeds: [embed1],
      components: [
        new ActionRowBuilder().addComponents(ageSelect),
        new ActionRowBuilder().addComponents(passionSelect),
        new ActionRowBuilder().addComponents(continentSelect)
      ]
    });

    // Panel 2: Photography Gear (Camera Brand & Lens Brand)
    const embed2 = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('📷 Photography Gear & Optics')
      .setDescription(
        `Show the community what camera bodies and telephoto lenses you use for planespotting!`
      )
      .addFields(
        {
          name: '📷 Camera Brand',
          value: '`Sony`, `Canon`, `Nikon`, `Fujifilm`, `Lumix`, `OM System`, `Smartphone`',
          inline: true
        },
        {
          name: '🔭 Lens Brand',
          value: '`Sony GM`, `Canon L`, `Nikkor`, `Sigma`, `Tamron`, `Samyang`, `Kit Glass`',
          inline: true
        }
      )
      .setFooter({ text: `${config.footerText} • Select multiple brands if applicable!` });

    const cameraSelect = new StringSelectMenuBuilder()
      .setCustomId('select_role_camera')
      .setPlaceholder(ROLE_CATEGORIES.camera.placeholder)
      .setMinValues(0)
      .setMaxValues(ROLE_CATEGORIES.camera.roles.length)
      .addOptions(
        ROLE_CATEGORIES.camera.roles.map(r =>
          new StringSelectMenuOptionBuilder()
            .setLabel(r.name)
            .setValue(r.id)
            .setDescription(r.description)
            .setEmoji(r.emoji)
        )
      );

    const lensSelect = new StringSelectMenuBuilder()
      .setCustomId('select_role_lens')
      .setPlaceholder(ROLE_CATEGORIES.lens.placeholder)
      .setMinValues(0)
      .setMaxValues(ROLE_CATEGORIES.lens.roles.length)
      .addOptions(
        ROLE_CATEGORIES.lens.roles.map(r =>
          new StringSelectMenuOptionBuilder()
            .setLabel(r.name)
            .setValue(r.id)
            .setDescription(r.description)
            .setEmoji(r.emoji)
        )
      );

    await channel.send({
      embeds: [embed2],
      components: [
        new ActionRowBuilder().addComponents(cameraSelect),
        new ActionRowBuilder().addComponents(lensSelect)
      ]
    });

    console.log(`🎨 Role Picker panels published in #${channel.name} (${guild.name})`);
  }
};

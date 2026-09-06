const { ChannelType, PermissionFlagsBits } = require('discord.js');

/**
 * Aviation & Flight Sim Community Server Blueprint & Rules Template
 */
module.exports = {
  // Stored Channel and Category IDs for reference / fast binding
  knownChannelIds: {
    categories: {
      important: '1524792072924696837',
      general: '1524791780741218345',
      spotting: '1525419639600058368',
      flightSim: '1525420007381794896',
      voiceChannels: '1525420326740168764',
      staff: '1524792220819918878'
    },
    channels: {
      news: '1524792111860285683',
      instagram: null,
      rules: '1524792139702337669',
      welcome: '1525420784103723079',
      roles: '1525420839116472340',
      chat: '1524791880162869329',
      picRating: '1524791955111018526',
      jetphotos: '1524792027877867692',
      yourPhotos: '1525419317615657121',
      aviation: '1525419370178678906',
      airportDiscussion: '1525419463724240976',
      questions: '1525420941612421211',
      offTopic: '1525419504794865665',
      memes: '1525419545769148507',
      media: '1525419592904872076',
      spottingLocations: '1525419707715424296',
      spottingPlans: '1525419755987669052',
      events: '1525421040958705705',
      weather: '1525419804259909682',
      rareCatches: '1525419896039669820',
      flightTracking: '1525419978399023135',
      msfs: '1525420092459057212',
      xPlane: '1525420124352417942',
      dcs: '1525420154056478770',
      otherSims: '1525420254598266890',
      generalVc: '1525420392188215307',
      spottingVc: '1525420447129145465',
      flightSimVc: '1525420524325437540',
      afkVc: '1525420559410921503',
      staffNews: '1524792364214915324',
      staffChat: '1524792260363944118',
      moderatorsChat: '1524792315414319125'
    }
  },

  // Server Roles
  roles: [
    {
      name: '👑ㆍOwner',
      color: 0xE74C3C, // Crimson Red / Gold
      hoist: true,
      permissions: [PermissionFlagsBits.Administrator]
    },
    {
      name: 'Admin',
      color: 0xE67E22, // Orange / Red
      hoist: true,
      permissions: [PermissionFlagsBits.Administrator]
    },
    {
      name: 'Moderator',
      color: 0x3498DB, // Blue
      hoist: true,
      permissions: [
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.KickMembers,
        PermissionFlagsBits.BanMembers,
        PermissionFlagsBits.ModerateMembers,
        PermissionFlagsBits.MuteMembers,
        PermissionFlagsBits.DeafenMembers,
        PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.ViewAuditLog
      ]
    },
    {
      name: 'Spotter',
      color: 0xF1C40F, // Gold/Yellow
      hoist: true,
      permissions: []
    },
    {
      name: 'Flight Simmer',
      color: 0x9B59B6, // Purple
      hoist: true,
      permissions: []
    },
    {
      name: '✈️ㆍVerified',
      color: 0x2ECC71, // Green
      hoist: false,
      permissions: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ]
    },
    {
      name: '🧪ㆍTester',
      color: 0x1ABC9C, // Teal
      hoist: false,
      permissions: [
        PermissionFlagsBits.ManageMessages // Grants Slowmode Immunity
      ]
    },
    {
      name: '💎ㆍOG Member',
      color: 0x00E5FF, // Diamond Cyan
      hoist: true,
      permissions: []
    },
    {
      name: '⭐ㆍVIP',
      color: 0xF1C40F, // Gold Amber
      hoist: true,
      permissions: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.UseExternalEmojis,
        PermissionFlagsBits.UseExternalStickers,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.PrioritySpeaker
      ]
    },
    {
      name: 'Aviator',
      color: 0x3498DB, // Blue
      hoist: false,
      permissions: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ]
    },
    {
      name: '⛔ㆍSuspended',
      color: 0x4F545C, // Dark Gray
      hoist: true,
      permissions: []
    }
  ],

  // Server Categories & Channels Architecture
  categories: [
    {
      name: 'Important',
      channels: [
        {
          name: '✅ㆍverify',
          type: ChannelType.GuildText,
          topic: 'Click the verify button to access all server channels and protect against bots.',
          isVerifyChannel: true
        },
        {
          name: '📰ㆍnews',
          type: ChannelType.GuildText,
          topic: 'Official aviation news, server announcements, and community updates.',
          readOnly: true
        },
        {
          name: '📸ㆍinstagram',
          type: ChannelType.GuildText,
          topic: 'Official Instagram posts, aviation photography highlights, and social updates.',
          readOnly: true
        },
        {
          name: '📜ㆍrules',
          type: ChannelType.GuildText,
          topic: 'Official server rules, photo guidelines, and community policies.',
          isRulesChannel: true,
          readOnly: true
        },
        {
          name: '👋ㆍwelcome',
          type: ChannelType.GuildText,
          topic: 'Welcome to the community! Check in here when arriving.',
          readOnly: true
        },
        {
          name: '🎉ㆍverified-welcome',
          type: ChannelType.GuildText,
          topic: 'Official arrivals and welcome lounge for verified community members.',
          readOnly: true
        },
        {
          name: '🎨ㆍroles',
          type: ChannelType.GuildText,
          topic: 'Pick your roles (Spotter, Flight Simmer, Pilot, etc.) and notifications.',
          readOnly: true
        },
        {
          name: '🔒ㆍappeal-hub',
          type: ChannelType.GuildText,
          topic: 'Quarantine area for suspended users undergoing ban or kick review.',
          isAppealHub: true
        }
      ]
    },
    {
      name: 'General',
      channels: [
        {
          name: '💬ㆍchat',
          type: ChannelType.GuildText,
          topic: 'Main hangout for daily conversation and general chatting.',
          rateLimitPerUser: 3
        },
        {
          name: '📤ㆍphoto-submit',
          type: ChannelType.GuildText,
          topic: 'Submit your planespotting & aviation photos here! Approved photos are published to #pic-rating.',
          rateLimitPerUser: 900 // 15-minute slowmode
        },
        {
          name: '📷ㆍpic-rating',
          type: ChannelType.GuildText,
          topic: 'Official Planespotter photo ratings! Vote 1-10 on submissions from #photo-submit.',
          readOnly: true
        },
        {
          name: '❓ㆍjetphotos',
          type: ChannelType.GuildText,
          topic: 'JetPhotos & screening assistance, rejection advice, centering, and editing tips.',
          rateLimitPerUser: 3
        },
        {
          name: '📸ㆍyour-photos',
          type: ChannelType.GuildText,
          topic: 'Showcase your best aviation and plane spotting photos.',
          rateLimitPerUser: 3
        },
        {
          name: '✈️ㆍaviation',
          type: ChannelType.GuildText,
          topic: 'Civil, commercial, cargo, military aviation discussions and airline talk.',
          rateLimitPerUser: 3
        },
        {
          name: '🛫ㆍairport-discussion',
          type: ChannelType.GuildText,
          topic: 'Talk about international airports, runways, ATC, terminals, and operations.',
          rateLimitPerUser: 3
        },
        {
          name: '💡ㆍquestions',
          type: ChannelType.GuildText,
          topic: 'Ask questions regarding aviation, photography gear, camera settings, or sims.',
          rateLimitPerUser: 3
        },
        {
          name: '🌍ㆍoff-topic',
          type: ChannelType.GuildText,
          topic: 'Non-aviation banter, casual discussions, and hobbies.',
          rateLimitPerUser: 3
        },
        {
          name: '😂ㆍmemes',
          type: ChannelType.GuildText,
          topic: 'Aviation memes and funny aviation clips (keep it SFW).',
          rateLimitPerUser: 3
        },
        {
          name: '📸ㆍmedia',
          type: ChannelType.GuildText,
          topic: 'Videos, YouTube links, cockpit footage, and aviation articles.',
          rateLimitPerUser: 3
        }
      ]
    },
    {
      name: 'Spotting',
      channels: [
        {
          name: '📍ㆍspotting-locations',
          type: ChannelType.GuildText,
          topic: 'Best spots, photography vantage points, parking, and airport viewing guides.'
        },
        {
          name: '🗓️ㆍspotting-plans',
          type: ChannelType.GuildText,
          topic: 'Organize spotter meetups, trips, and upcoming airport visits.'
        },
        {
          name: '📆ㆍevents',
          type: ChannelType.GuildText,
          topic: 'Airshows, fly-ins, airport open days, and special aviation events.'
        },
        {
          name: '🌤️ㆍweather',
          type: ChannelType.GuildText,
          topic: 'METAR, TAF, wind directions, light angles, and spotting weather forecasts.'
        },
        {
          name: '🎯ㆍrare-catches',
          type: ChannelType.GuildText,
          topic: 'Special liveries, government VIPs, retro jets, delivery flights, and diversions.'
        },
        {
          name: '📈ㆍflight-tracking',
          type: ChannelType.GuildText,
          topic: 'Flightradar24, ADS-B Exchange, RadarBox links, and squawk tracking.'
        }
      ]
    },
    {
      name: 'Flight Sim',
      channels: [
        {
          name: '🛩️ㆍmsfs',
          type: ChannelType.GuildText,
          topic: 'Microsoft Flight Simulator (MSFS 2020 / 2024) discussion, add-ons, and screenshots.'
        },
        {
          name: '✈️ㆍx-plane',
          type: ChannelType.GuildText,
          topic: 'X-Plane 11 & 12 discussion, flight models, plugins, and liveries.'
        },
        {
          name: '🚁ㆍdcs',
          type: ChannelType.GuildText,
          topic: 'Digital Combat Simulator (DCS World) military sorties, tactics, and modules.'
        },
        {
          name: '🎮ㆍother-sims',
          type: ChannelType.GuildText,
          topic: 'Prepar3D, Infinite Flight, Aerofly FS, VATSIM / IVAO online ATC networks.'
        }
      ]
    },
    {
      name: 'Voice Channels',
      channels: [
        {
          name: 'General VC',
          type: ChannelType.GuildVoice
        },
        {
          name: 'Spotting VC',
          type: ChannelType.GuildVoice
        },
        {
          name: 'Flight Sim VC',
          type: ChannelType.GuildVoice
        },
        {
          name: 'AFK',
          type: ChannelType.GuildVoice
        }
      ]
    },
    {
      name: 'Staff',
      staffOnly: true,
      channels: [
        {
          name: '📢ㆍstaff-news',
          type: ChannelType.GuildText,
          topic: 'Internal announcements and staff team briefings.'
        },
        {
          name: '💬ㆍstaff-chat',
          type: ChannelType.GuildText,
          topic: 'General discussions for server administrators and moderators.'
        },
        {
          name: '📳ㆍmoderators-chat',
          type: ChannelType.GuildText,
          topic: 'Moderation logs, incident reviews, and member case discussions.'
        },
        {
          name: '⚖️ㆍappeals',
          type: ChannelType.GuildText,
          topic: 'Incoming user punishment appeals (Bans, Kicks, Timeouts) for review.'
        }
      ]
    }
  ],

  // Comprehensive English Rules tailored specifically for Aviation, Spotting & Flight Sim
  rulesContent: {
    title: '📜 Community Rules & Aviation Guidelines',
    description: 'Welcome to our **Aviation, Plane Spotting & Flight Simulation** community! To keep our hangar welcoming, safe, and productive for all aviators, photographers, and simmers, please strictly adhere to the following rules:',
    fields: [
      {
        name: '1. Respect & Civil Conduct',
        value: 'Treat every member with respect. Toxicity, harassment, discrimination, hate speech, personal attacks, or aggressive gatekeeping will not be tolerated.'
      },
      {
        name: '2. Language & Communication',
        value: 'Please use **English** in all public channels to maintain clear communication and facilitate moderation across our global aviation community.'
      },
      {
        name: '3. Photography & Copyright Etiquette',
        value: '• Always credit the photographer if you post photos that are not your own.\n• Do not claim other people\'s photos as your work.\n• In `#📷ㆍpic-rating` and `#❓ㆍjetphotos`, provide constructive, polite feedback focusing on technical aspects (centering, lighting, sharpness, grain).'
      },
      {
        name: '4. Spotting Safety & Airport Security',
        value: 'Never promote, encourage, or depict illegal trespassing onto restricted airport property, dangerous laser pointing, or safety violations. Always respect local aviation authority laws and airport security.'
      },
      {
        name: '5. Proper Channel Usage',
        value: 'Keep discussions in their respective channels:\n• `#💬ㆍchat`: General casual chat.\n• `#✈️ㆍaviation` & `#🛫ㆍairport-discussion`: Real-world aviation.\n• `#📍ㆍspotting-locations` & `#🎯ㆍrare-catches`: Plane spotting & tracking.\n• `#🛩️ㆍmsfs`, `#✈️ㆍx-plane`, `#🚁ㆍdcs`: Flight simulation.\n• `#😂ㆍmemes`: Aviation humor.'
      },
      {
        name: '6. No Piracy or Illegal Content',
        value: 'Do not share, request, or discuss cracked flight sim add-ons (MSFS, X-Plane, P3D, DCS modules), illegal payware sharing, or keygens. Support developers.'
      },
      {
        name: '7. No Spam, Advertisements, or DM Solicitation',
        value: 'Spamming, excessive self-promotion, selling goods/services, or unsolicited advertising via channel posts or direct messages (DMs) is strictly prohibited.'
      },
      {
        name: '8. SFW Content Only',
        value: 'All content (avatars, banners, text, images, videos, memes) must remain strictly Safe For Work (SFW) and family-friendly.'
      },
      {
        name: '9. Staff Discretion & Discord ToS',
        value: 'Follow [Discord Terms of Service](https://discord.com/terms) and [Community Guidelines](https://discord.com/guidelines). Staff members have the final authority to enforce these rules. If you need help, open a ticket or contact a Moderator.'
      }
    ],
    footer: 'By participating in this server, you agree to follow all the rules listed above.'
  }
};

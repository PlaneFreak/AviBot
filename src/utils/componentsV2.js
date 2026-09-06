const { Routes } = require('discord.js');

/**
 * Universal Discord Components V2 Engine (flags: 32768)
 * Standardizes ALL bot messages, embeds, and interactions into modern Discord Containers (type 17)
 * where buttons, media, and text are seamlessly rendered inside the container card!
 */
module.exports = {
  IS_COMPONENTS_V2: 32768,

  /**
   * Helper to build a Container (type 17)
   */
  createContainer({ accentColor = 0x2B2D31, components = [] }) {
    const container = {
      type: 17,
      components
    };
    if (accentColor !== undefined && accentColor !== null) {
      container.accent_color = typeof accentColor === 'string' ? parseInt(accentColor.replace('#', ''), 16) : accentColor;
    }
    return container;
  },

  /**
   * Helper to build a Section (type 9 with accessory) or TextDisplay (type 10 without accessory)
   */
  createSection({ text, accessory = null }) {
    if (!accessory) {
      return {
        type: 10,
        content: text
      };
    }
    return {
      type: 9,
      components: [
        {
          type: 10,
          content: text
        }
      ],
      accessory
    };
  },

  /**
   * Helper to build a Thumbnail accessory (type 11)
   */
  createThumbnail(url) {
    return {
      type: 11,
      media: {
        url
      }
    };
  },

  /**
   * Helper to build a TextDisplay (type 10)
   */
  createText(content) {
    return {
      type: 10,
      content
    };
  },

  /**
   * Helper to build a Media Gallery (type 12)
   */
  createMediaGallery(urls = []) {
    const items = (Array.isArray(urls) ? urls : [urls]).filter(Boolean).map(url => ({
      media: { url }
    }));
    return {
      type: 12,
      items
    };
  },

  /**
   * Helper to build a Separator (type 14)
   */
  createSeparator({ divider = true, spacing = 1 } = {}) {
    return {
      type: 14,
      divider,
      spacing
    };
  },

  /**
   * Helper to build an ActionRow (type 1) inside container
   */
  createActionRow(buttons = []) {
    return {
      type: 1,
      components: buttons
    };
  },

  /**
   * Helper to build a Button (type 2)
   */
  createButton({ customId, label, style = 2, emoji = null, disabled = false, url = null }) {
    const btn = {
      type: 2,
      style: url ? 5 : style,
      disabled
    };
    if (url) {
      btn.url = url;
    } else if (customId) {
      btn.custom_id = customId;
    }
    if (label) btn.label = label;
    if (emoji) {
      if (typeof emoji === 'string') {
        btn.emoji = { name: emoji };
      } else {
        btn.emoji = emoji;
      }
    }
    return btn;
  },

  /**
   * Converts any standard Embed into a Components V2 Container (with buttons inside!)
   */
  fromEmbed(embed, rows = []) {
    const data = embed.data || embed;
    const components = [];

    // 1. Media Image (if any)
    if (data.image && data.image.url) {
      components.push(this.createMediaGallery([data.image.url]));
    }

    // 2. Build Markdown Text Content
    let text = '';
    if (data.title) {
      text += `# ${data.title}\n\n`;
    }
    if (data.description) {
      text += `${data.description}\n\n`;
    }
    if (data.fields && data.fields.length > 0) {
      text += data.fields.map(f => `**${f.name}**\n${f.value}`).join('\n\n') + '\n\n';
    }
    if (data.footer && data.footer.text) {
      text += `*${data.footer.text}*`;
    }

    // 3. Main Section with optional Thumbnail accessory
    let accessory = null;
    if (data.thumbnail && data.thumbnail.url) {
      accessory = this.createThumbnail(data.thumbnail.url);
    }

    if (text.trim().length > 0) {
      components.push(this.createSection({ text: text.trim(), accessory }));
    }

    // 4. Action Rows (placed directly inside the container!)
    if (rows && rows.length > 0) {
      for (const row of rows) {
        if (row.components) {
          // If Discord.js ActionRow or raw array
          const rawButtons = row.components.map(comp => {
            if (comp.data) return comp.data;
            return comp;
          });
          components.push(this.createActionRow(rawButtons));
        } else if (Array.isArray(row)) {
          components.push(this.createActionRow(row));
        }
      }
    }

    return this.createContainer({
      accentColor: data.color || 0x2B2D31,
      components
    });
  },

  /**
   * Send a Components V2 payload to a channel via Discord REST
   */
  async sendToChannel(client, channelId, components, files = []) {
    const body = {
      flags: 32768,
      components: Array.isArray(components) ? components : [components]
    };

    const options = { body };
    if (files && files.length > 0) {
      options.files = files;
    }

    return await client.rest.post(Routes.channelMessages(channelId), options);
  },

  /**
   * Reply to a Discord interaction with Components V2
   * Supports both ephemeral and non-ephemeral responses
   */
  async replyToInteraction(interaction, containers, { ephemeral = false, content = null } = {}) {
    let flags = 32768; // IS_COMPONENTS_V2
    if (ephemeral) flags |= 64; // EPHEMERAL

    const payload = {
      flags,
      components: Array.isArray(containers) ? containers : [containers]
    };
    if (content) payload.content = content;

    if (interaction.replied || interaction.deferred) {
      return await interaction.editReply(payload);
    }
    return await interaction.reply(payload);
  },

  /**
   * Edit a deferred interaction reply with Components V2
   */
  async editInteractionReply(interaction, containers, { content = null } = {}) {
    const payload = {
      flags: 32768,
      components: Array.isArray(containers) ? containers : [containers]
    };
    if (content) payload.content = content;

    return await interaction.editReply(payload);
  },

  /**
   * Send Components V2 via DM to a user
   */
  async sendDM(client, userId, containers) {
    try {
      const dmChannel = await client.users.createDM(userId);
      return await client.rest.post(Routes.channelMessages(dmChannel.id), {
        body: {
          flags: 32768,
          components: Array.isArray(containers) ? containers : [containers]
        }
      });
    } catch (err) {
      // DMs may be disabled — fail silently like the old code
      return null;
    }
  }
};

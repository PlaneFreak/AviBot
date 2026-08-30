const { ChannelType, PermissionFlagsBits } = require('discord.js');
const componentsV2 = require('../utils/componentsV2');
const serverTemplate = require('../templates/serverTemplate');
const config = require('../config');

const RULES_CHANNEL_NAME = '📜ㆍrules';

function buildRulesV2Container() {
  const rulesData = serverTemplate.rulesContent;

  let rulesMarkdown =
    `# ${rulesData.title}\n\n` +
    `${rulesData.description}\n\n`;

  for (const field of rulesData.fields) {
    rulesMarkdown += `### ${field.name}\n${field.value}\n\n`;
  }

  rulesMarkdown += `*${rulesData.footer}*`;

  return componentsV2.createContainer({
    accentColor: config.colors.primary,
    components: [
      componentsV2.createSection({
        text: rulesMarkdown.trim(),
        accessory: componentsV2.createThumbnail('https://cdn-icons-png.flaticon.com/512/3500/3500833.png')
      }),
      componentsV2.createActionRow([
        componentsV2.createButton({
          label: 'Discord Community Guidelines',
          emoji: '📖',
          url: 'https://discord.com/guidelines'
        })
      ])
    ]
  });
}

module.exports = {
  RULES_CHANNEL_NAME,
  buildRulesV2Container,

  /**
   * Finds or creates the rules channel and posts the Components V2 rules container
   */
  async ensureRulesPanel(guild) {
    try {
      const channels = await guild.channels.fetch();
      let channel = channels.find(
        c => c && c.type === ChannelType.GuildText && (c.name === RULES_CHANNEL_NAME || c.name.toLowerCase().includes('rule'))
      );

      if (!channel) return null;

      const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
      let hasV2Rules = false;

      if (messages && messages.size > 0) {
        for (const [, msg] of messages) {
          if (msg.author.id === guild.client.user.id) {
            if (msg.flags.has(32768)) {
              hasV2Rules = true;
            } else {
              // Delete old format
              await msg.delete().catch(() => {});
            }
          }
        }
      }

      if (!hasV2Rules) {
        const container = buildRulesV2Container();
        await componentsV2.sendToChannel(guild.client, channel.id, [container]).catch(err => {
          console.error('Failed to post Components V2 rules:', err);
        });
        console.log(`📜 Components V2 Rules published in #${channel.name} (${guild.name})`);
      }

      return channel;
    } catch (err) {
      console.error('Error ensuring rules panel:', err);
      return null;
    }
  }
};

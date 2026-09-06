const { SlashCommandBuilder } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with bot and Discord API latency'),

  async execute(interaction, client) {
    const sent = await interaction.reply({
      content: 'Pinging...',
      fetchReply: true
    });

    const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = client.ws.ping;

    const md = `# 🏓 Pong!\n\n**📡 Bot Latency**\n\`${roundtripLatency}ms\`\n\n**💓 API Latency**\n\`${wsPing}ms\`\n\n*${config.footerText}* <t:${Math.floor(Date.now() / 1000)}:R>`;
    const container = componentsV2.createContainer({
      accentColor: config.colors.primary,
      components: [
        componentsV2.createSection({ text: md })
      ]
    });

    await componentsV2.editInteractionReply(interaction, [container], { content: null });
  }
};

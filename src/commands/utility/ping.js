const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: '📡 Bot Latency', value: `\`${roundtripLatency}ms\``, inline: true },
        { name: '💓 API Latency', value: `\`${wsPing}ms\``, inline: true }
      )
      .setFooter({ text: config.footerText })
      .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed] });
  }
};

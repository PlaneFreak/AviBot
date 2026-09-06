const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js');
const instagramService = require('../../services/instagramService');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('instagram')
    .setDescription('Manage Instagram feed, announcements, and webhook settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(sub =>
      sub
        .setName('post')
        .setDescription('Publish an Instagram post to the Instagram channel with @everyone ping')
        .addStringOption(opt =>
          opt
            .setName('url')
            .setDescription('Direct link to the Instagram post (e.g. https://www.instagram.com/p/...)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('caption')
            .setDescription('Caption or description of the post')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('image_url')
            .setDescription('Direct image URL for image preview (optional)')
            .setRequired(false)
        )
        .addBooleanOption(opt =>
          opt
            .setName('ping')
            .setDescription('Whether to ping @everyone (default: True)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('test')
        .setDescription('Sends a test preview post into the Instagram channel (no @everyone ping)')
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('View current Instagram feed settings, channel, and webhook endpoint')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (
      !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) &&
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.reply({
        content: '❌ You need **Manage Messages** or **Administrator** permissions to use this command.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      if (sub === 'post') {
        const postUrl = interaction.options.getString('url');
        const caption = interaction.options.getString('caption') || '';
        const imageUrl = interaction.options.getString('image_url') || null;
        const ping = interaction.options.getBoolean('ping') ?? true;

        const result = await instagramService.postInstagramUpdate(interaction.client, {
          postUrl,
          caption,
          imageUrl,
          author: config.instagram.username || 'eddm.a350.spotter',
          pingEveryone: ping,
          guildId: guild.id,
          force: true // manual post overrides duplicate check
        });

        if (result.success) {
          const channel = await instagramService.ensureInstagramChannel(guild);
          return interaction.editReply({
            content: `✅ **Instagram post successfully published!**\nSent to <#${channel.id}> with ${ping ? '@everyone ping' : 'no ping'}.\n🔗 Post URL: <${postUrl}>`
          });
        } else if (result.skipped) {
          return interaction.editReply({
            content: `ℹ️ This post has already been shared in the channel!`
          });
        } else {
          return interaction.editReply({
            content: `❌ Failed to publish Instagram post. Please check bot permissions.`
          });
        }
      }

      if (sub === 'test') {
        const channel = await instagramService.ensureInstagramChannel(guild);
        if (!channel) {
          return interaction.editReply({
            content: `❌ Could not find or create the \`📸ㆍinstagram\` channel in the **Important** category.`
          });
        }

        const testUrl = `https://www.instagram.com/${config.instagram.username || 'eddm.a350.spotter'}/`;
        const testResult = await instagramService.postInstagramUpdate(interaction.client, {
          postUrl: testUrl,
          caption: '🛫 This is an automated test post to verify the Instagram feed channel in the **Important** category (under news).',
          author: config.instagram.username || 'eddm.a350.spotter',
          pingEveryone: false,
          guildId: guild.id,
          force: true
        });

        return interaction.editReply({
          content: `✅ **Test successful!**\nA test preview was posted to <#${channel.id}> without @everyone ping.`
        });
      }

      if (sub === 'status') {
        const channel = await instagramService.ensureInstagramChannel(guild);
        const username = config.instagram.username || 'eddm.a350.spotter';
        const webhookPort = config.instagram.webhookPort || 3050;
        const hasSecret = !!config.instagram.webhookSecret;
        const rssUrl = config.instagram.rssUrl || 'None (disabled)';

        const statusMsg = `## 📸 Instagram Integration Status\n\n` +
          `• **Instagram Account:** \`@${username}\` (<https://www.instagram.com/${username}/>)\n` +
          `• **Channel:** ${channel ? `<#${channel.id}> (\`${channel.name}\`)` : '⚠️ Not found'}\n` +
          `• **Position:** **Important** category (directly under news)\n` +
          `• **Webhook Port:** \`${webhookPort}\`\n` +
          `• **Webhook Endpoint:** \`POST http://<SERVER_IP>:${webhookPort}/api/instagram\`\n` +
          `• **Webhook Secret:** ${hasSecret ? '🔒 Enabled' : '🔓 None (open)'}\n` +
          `• **RSS Feed URL:** \`${rssUrl}\`\n\n` +
          `*Tip: You can manually publish a post with @everyone anytime using \`/instagram post <url>\`!*`;

        return interaction.editReply({ content: statusMsg });
      }
    } catch (err) {
      console.error('Error in /instagram command:', err);
      return interaction.editReply({
        content: `❌ Execution error: ${err.message}`
      });
    }
  }
};

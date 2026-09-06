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
            content: `ℹ️ Dieser Post wurde bereits zuvor im Kanal geteilt!`
          });
        } else {
          return interaction.editReply({
            content: `❌ Fehler beim Veröffentlichen des Instagram-Posts. Bitte überprüfe die Bot-Rechte.`
          });
        }
      }

      if (sub === 'test') {
        const channel = await instagramService.ensureInstagramChannel(guild);
        if (!channel) {
          return interaction.editReply({
            content: `❌ Konnte den Kanal \`📸ㆍinstagram\` in der Kategorie **Important** nicht finden oder erstellen.`
          });
        }

        const testUrl = `https://www.instagram.com/${config.instagram.username || 'eddm.a350.spotter'}/`;
        const testResult = await instagramService.postInstagramUpdate(interaction.client, {
          postUrl: testUrl,
          caption: '🛫 Dies ist ein automatischer Test-Post zur Überprüfung des Instagram-Kanals in der Kategorie **Important** (unter news).',
          author: config.instagram.username || 'eddm.a350.spotter',
          pingEveryone: false,
          guildId: guild.id,
          force: true
        });

        return interaction.editReply({
          content: `✅ **Test erfolgreich!**\nEine Testnachricht wurde in <#${channel.id}> ohne @everyone-Ping gepostet.`
        });
      }

      if (sub === 'status') {
        const channel = await instagramService.ensureInstagramChannel(guild);
        const username = config.instagram.username || 'eddm.a350.spotter';
        const webhookPort = config.instagram.webhookPort || 3000;
        const hasSecret = !!config.instagram.webhookSecret;
        const rssUrl = config.instagram.rssUrl || 'Keine (deaktiviert)';

        const statusMsg = `## 📸 Instagram Integration Status\n\n` +
          `• **Instagram Account:** \`@${username}\` (<https://www.instagram.com/${username}/>)\n` +
          `• **Kanal:** ${channel ? `<#${channel.id}> (\`${channel.name}\`)` : '⚠️ Nicht gefunden'}\n` +
          `• **Position:** Kategorie **Important** (direkt unter news)\n` +
          `• **Webhook Port:** \`${webhookPort}\`\n` +
          `• **Webhook Endpunkt:** \`POST http://<SERVER_IP>:${webhookPort}/api/instagram\`\n` +
          `• **Webhook Secret:** ${hasSecret ? '🔒 Aktiviert' : '🔓 Keine (offen)'}\n` +
          `• **RSS Feed URL:** \`${rssUrl}\`\n\n` +
          `*Tipp: Du kannst jederzeit manuell mit \`/instagram post <url>\` einen Beitrag mit @everyone veröffentlichen!*`;

        return interaction.editReply({ content: statusMsg });
      }
    } catch (err) {
      console.error('Error in /instagram command:', err);
      return interaction.editReply({
        content: `❌ Fehler bei der Ausführung: ${err.message}`
      });
    }
  }
};

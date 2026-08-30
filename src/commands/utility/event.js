const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const eventService = require('../../services/eventService');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('Community event management')
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Create and publish a new community event')
        .addStringOption(opt =>
          opt
            .setName('title')
            .setDescription('Title / Name of the event')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('description')
            .setDescription('Event description, requirements & rules')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('rewards')
            .setDescription('Prizes and rewards (e.g. VIP Role, XP)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('deadline')
            .setDescription('Until when does the event run? (e.g. Sunday 20:00 UTC)')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === 'create') {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers) &&
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
      ) {
        return interaction.reply({
          content: '❌ You need **Moderator** or **Administrator** permissions to create events.',
          flags: 64
        });
      }

      await interaction.deferReply({ flags: 64 });

      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const rewards = interaction.options.getString('rewards');
      const deadline = interaction.options.getString('deadline');

      const eventsChannel = await eventService.getOrCreateEventsChannel(guild);
      const componentsV2 = require('../../utils/componentsV2');

      const container = componentsV2.createContainer({
        accentColor: 0x9B59B6,
        components: [
          componentsV2.createSection({
            text:
              `# 🎉 NEW COMMUNITY EVENT: ${title}\n\n` +
              `### 📖 Overview & Details\n${description}\n\n` +
              `### 🏆 Prizes & Rewards\n${rewards}\n\n` +
              `### ⏰ Deadline / End Date\n**${deadline}**\n\n` +
              `**Hosted By:** ${interaction.user} (\`${interaction.user.tag}\`)`,
            accessory: componentsV2.createThumbnail('https://cdn-icons-png.flaticon.com/512/3112/3112942.png')
          }),
          componentsV2.createActionRow([
            componentsV2.createButton({
              customId: 'event_join_toggle',
              label: "I'm Participating!",
              emoji: '🎉',
              style: 3 // Success green
            })
          ])
        ]
      });

      await eventsChannel.send({ content: `📢 @everyone **A new community event has started!**` }).catch(() => {});
      await componentsV2.sendToChannel(guild.client, eventsChannel.id, [container]);

      return interaction.editReply({
        content: `✅ **Event successfully created and published in ${eventsChannel}!**`
      });
    }
  }
};

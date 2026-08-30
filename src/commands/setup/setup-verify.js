const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const componentsV2 = require('../../utils/componentsV2');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-verify')
    .setDescription('Posts the official server verification message with a Verify button (Components V2)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Channel to post the verification embed in (defaults to current channel)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('Role to grant upon verification (defaults to Verified role)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    const specifiedRole = interaction.options.getRole('role');
    const defaultRole = specifiedRole || interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes('verified') || r.name.toLowerCase() === 'aviator');

    const roleName = defaultRole ? defaultRole.name : 'Verified';
    const roleId = defaultRole ? defaultRole.id : 'auto';

    const container = componentsV2.createContainer({
      accentColor: config.colors.primary,
      components: [
        componentsV2.createSection({
          text:
            `# 🛫 Welcome & Server Verification\n\n` +
            `Welcome to **${interaction.guild.name}**!\n\n` +
            `To gain full access to all channels, planespotting feeds, flight sim lounges, and community discussions, please click the **Verify & Enter** button below.\n\n` +
            `**🛡️ Member Access:** Grants the **@${roleName}** role immediately.\n` +
            `*Before verifying, please ensure you have read our server rules in #📜ㆍrules.*`,
          accessory: componentsV2.createThumbnail('https://cdn-icons-png.flaticon.com/512/3125/3125713.png')
        }),
        componentsV2.createActionRow([
          componentsV2.createButton({
            customId: `verify_member_${roleId}`,
            label: 'Verify & Enter',
            style: 3, // Success green
            emoji: '✅'
          })
        ])
      ]
    });

    await componentsV2.sendToChannel(interaction.client, targetChannel.id, [container]);

    return interaction.reply({
      content: `✅ Verification panel successfully published to ${targetChannel} using Components V2!`,
      flags: 64
    });
  }
};

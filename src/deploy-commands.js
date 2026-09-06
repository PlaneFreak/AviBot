const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('❌ Error: Missing DISCORD_TOKEN or CLIENT_ID in .env file!');
  console.log('Please fill in your bot token and client ID in .env before deploying commands.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
  const categories = fs.readdirSync(commandsPath);
  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = path.join(categoryPath, file);
      const command = require(filePath);
      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
      } else {
        console.warn(`⚠️ Warning: Command at ${filePath} is missing required "data" or "execute" property.`);
      }
    }
  }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`⏳ Started refreshing ${commands.length} application (/) commands...`);

    if (guildId) {
      // Guild-specific deployment: INSTANT update on the specified server
      const data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      console.log(`✅ Successfully reloaded ${data.length} application (/) commands INSTANTLY on Server [ID: ${guildId}]!`);
    } else {
      // Global deployment: Can take up to an hour to cache across all servers
      const data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log(`✅ Successfully reloaded ${data.length} global application (/) commands!`);
    }
  } catch (error) {
    console.error('❌ Failed to deploy application commands:', error);
  }
})();

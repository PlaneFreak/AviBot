const { Client, GatewayIntentBits, Partials } = require('discord.js');
const commandHandler = require('./handlers/commandHandler');
const eventHandler = require('./handlers/eventHandler');
const config = require('./config');
const db = require('./database/db');
const expirationWorker = require('./workers/expirationWorker');
const leaderboardWorker = require('./workers/leaderboardWorker');

// Initialize Discord Client with necessary Gateway Intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember
  ]
});

// Global Error Catchers (prevent bot process crashes)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err, origin) => {
  console.error(`Caught exception: ${err}\nException origin: ${origin}`);
});

// Check if DISCORD_TOKEN is present
if (!config.token) {
  console.error('❌ Error: No DISCORD_TOKEN found in .env file!');
  console.log('Please copy .env.example to .env and insert your bot token.');
  process.exit(1);
}

// Start sequence
(async () => {
  // 1. Initialize PostgreSQL / Fallback Database
  await db.initDB();

  // 2. Load Command and Event Handlers
  commandHandler(client);
  eventHandler(client);

  // 3. Start Expiration Worker
  expirationWorker.start(client);

  // 4. Start Leaderboard Worker
  leaderboardWorker.start(client);

  // 5. Log in to Discord
  client.login(config.token).catch((err) => {
    console.error('❌ Failed to login to Discord:', err.message);
    process.exit(1);
  });
})();

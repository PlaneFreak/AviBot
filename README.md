# AviBot - Discord Moderation & Server Setup Bot

A modern Discord bot built with **JavaScript (Node.js)** and **discord.js v14**, featuring full moderation tools, automated server setup, rules management, and channel inspection.

---

## 🚀 Features

- **Instant Slash Commands**: Configured for instant deployment on your guild (`1524791551820173622`).
- **Server Setup Automation (`/setup-server`)**: Creates entire server hierarchy (categories, text channels, voice channels, roles, and permissions) and automatically publishes the official rules.
- **Channel Inspector (`/list-channels`)**: Dumps all server channels and IDs in `"channel-name" | id` format (with optional text file export).
- **Rules Publisher (`/post-rules`)**: Posts or refreshes styled rules embed into any designated channel.
- **Interactive Appeal System**:
  - Automatically attaches a `📝 Submit Appeal` button in user DMs upon `/ban`, `/kick`, or `/timeout`.
  - Opens a Discord Modal form for users to provide explanations/apologies.
  - Automatically routes appeals to the `⚖️ㆍappeals` channel (auto-created with staff permissions if missing).
  - Staff can resolve appeals with 1-click `✅ Accept Appeal` (auto-unbans, lifts timeout, or generates a re-invite link) or `❌ Reject Appeal`.
- **Utility**:
  - `/ping` (WebSocket & bot latency)
  - `/help` (Detailed command guide)

---

## 📋 Prerequisites & Setup

### 1. Discord Developer Portal Setup
1. Visit [Discord Developer Portal](https://discord.com/developers/applications) and create a **New Application**.
2. Go to the **Bot** tab:
   - Click **Add Bot** / **Reset Token** to copy your **Bot Token**.
   - Enable **Privileged Gateway Intents**:
     - ✅ **Presence Intent**
     - ✅ **Server Members Intent**
     - ✅ **Message Content Intent**
3. Go to **OAuth2 > URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: Select `Administrator` (or *Manage Channels*, *Manage Roles*, *Ban Members*, *Kick Members*, *Moderate Members*, *Manage Messages*, *View Channels*, *Send Messages*, *Embed Links*).
   - Copy the generated URL and invite the bot to your server.

### 2. Configure `.env`
Open `.env` and fill in your values:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id_here
GUILD_ID=1524791551820173622
```

> **Note**: Setting `GUILD_ID` ensures that whenever you run `npm run deploy-commands`, all slash commands are registered **instantly** without waiting for Discord's 1-hour global cache propagation!

---

## 🛠️ Usage Commands

### Register / Update Slash Commands
```bash
npm run deploy-commands
```

### Deploy Commands & Start/Restart in One Command
```bash
npm run restart
```

### Start the Bot
```bash
# Normal Start
npm start

# Development Mode (auto-restart on file changes)
npm run dev
```

---

## 📁 Project Structure

```
AviBot/
├── src/
│   ├── commands/
│   │   ├── moderation/
│   │   │   ├── ban.js
│   │   │   ├── clear.js
│   │   │   ├── kick.js
│   │   │   ├── timeout.js
│   │   │   ├── untimeout.js
│   │   │   └── warn.js
│   │   ├── setup/
│   │   │   ├── post-rules.js
│   │   │   └── setup-server.js
│   │   └── utility/
│   │       ├── help.js
│   │       ├── list-channels.js
│   │       └── ping.js
│   ├── events/
│   │   ├── interactionCreate.js
│   │   └── ready.js
│   ├── handlers/
│   │   ├── commandHandler.js
│   │   └── eventHandler.js
│   ├── templates/
│   │   └── serverTemplate.js   <-- Customize your server layout & rules here
│   ├── config.js
│   ├── deploy-commands.js
│   └── index.js
├── .env.example
├── .env
├── package.json
└── README.md
```

# ✈️ AviBot — Advanced Aviation, Planespotting & Discord Community Suite

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v20%20LTS-green?style=for-the-badge&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/Discord.js-v14.16-blue?style=for-the-badge&logo=discord" alt="Discord.js" />
  <img src="https://img.shields.io/badge/Database-SQLite3%20WAL-orange?style=for-the-badge&logo=sqlite" alt="SQLite" />
  <img src="https://img.shields.io/badge/AI%20Vision-Google%20Gemini-8E44AD?style=for-the-badge&logo=google" alt="Google Gemini" />
  <img src="https://img.shields.io/badge/Hardware-Raspberry%20Pi%205-C51A4A?style=for-the-badge&logo=raspberrypi" alt="Raspberry Pi 5" />
</p>

**AviBot** is a high-performance, feature-packed Discord Bot engineered specifically for **Planespotting Communities, Aviation Enthusiasts, and Flight Simulators**. Powered by **Google Gemini AI Vision**, an interactive **Photo Rating & Leaderboard Engine**, **Dual Community Leveling**, strict **Anti-Raid Isolation**, and **JetPhotos Account Verification**.

---

## 🌟 Key Features

### 📸 1. AI-Powered Planespotting Photo Engine (`#pic-rating`)
- **Gemini Vision AI Analysis**: Every uploaded photo is automatically screened by Google Gemini Vision AI to ensure authentic aviation content (aircraft, cockpits, runways, spotting views). Non-aviation posts are auto-rejected.
- **Interactive 1–10 Rating System**: Clean 2-row button interface (`1️⃣` to `🔟 (+2 Bonus)`).
- **Anti-Self-Vote & Double-Vote Guard**: Users cannot vote on their own photos; votes can be changed dynamically.
- **Permanent In-Memory Image Buffering**: Zero broken Discord CDN links.

---

### 🏆 2. Multi-Interval Photo Leaderboards & Spotter XP
- **Automated Recurring Resets**:
  - 📅 **Daily (24h)** | 🗓️ **3-Day (72h)** | 📆 **Weekly (7d)** | 🌟 **Monthly (30d)** | 👑 **Yearly (365d)**
- **Dedicated Channel (`#photo-leaderboard`)**: High-ranking photos are archived and awarded scaled Spotter XP.
- **Aviation Rank Titles**:
  - `🛫 Flight Cadet` ➔ `🛩️ Junior Spotter` ➔ `📷 Senior Spotter` ➔ `👨‍✈️ First Officer` ➔ `🎖️ Captain` ➔ `👑 Senior Captain` ➔ `🌌 Aviation Legend`

---

### 💬 3. Dual Community Activity Leveling System
- **Independent Chat Leveling**: Separate from photo ratings. Members earn `15–25 XP` per valid chat message.
- **Balanced "Medium to Hard" Progression**: Exponential scaling prevents easy max-leveling.
- **Anti-Spam Filter**: 60-second cooldown per user; short spam messages (< 5 chars) & bot commands are ignored.
- **Activity Badges**: `💬 Passenger` ➔ `🎫 Frequent Flyer` ➔ `🛫 Silver Aviator` ➔ `🌟 Gold Aviator` ➔ `💎 Diamond Aviator` ➔ `👑 Server Legend`.
- **Commands**: `/rank` (Dual Profile Card) and `/top-chatters` (Activity Leaderboard).

---

### ✈️ 4. AI-Powered JetPhotos Account Verification
- **Command**: `/jetphotos-verify screenshot:[image]`
- **Anti-Impersonation Ownership Check**: Google Gemini AI verifies two mandatory criteria in the uploaded dashboard screenshot:
  1. 🌐 **Full Browser URL Bar**: The uncropped browser address bar must be visible.
  2. 📊 **Private Acceptance Rate**: Only visible in the photographer's personal logged-in dashboard.
- **Automated Role Tiers**:
  - `🏆ㆍJP Pro Spotter`: Unlocked at **150+ accepted photos** (with public celebration shoutout!).
  - `✈️ㆍJP Spotter`: Unlocked at **1+ accepted photos**.

---

### 🎨 5. Interactive Role Picker (`#roles`)
- **Multi-Category Dropdown Menus**:
  1. 🔞 **Age Group** (`Under 18` | `18+`)
  2. ✈️ **Identity & Passion** (`Planespotter`, `Aviation Enthusiast`, `Real-World Pilot`, `Flight Simmer`)
  3. 📷 **Camera Brand** (`Sony`, `Canon`, `Nikon`, `Fujifilm`, `Lumix`, `OM System`, `Smartphone`, `Other`)
  4. 🔭 **Lens Brand** (`Sony GM`, `Canon L`, `Nikkor`, `Sigma`, `Tamron`, `Samyang`, `Kit Glass`)
  5. 🌍 **Home Continent** (`Europe`, `North America`, `South America`, `Asia`, `Africa`, `Oceania`)

---

### 🛡️ 6. Anti-Raid Isolation & Welcome Routing
- **Complete Channel Lockdown**: Unverified members (`@everyone`) see ONLY `#welcome` and `#verify`. All other channels are strictly invisible.
- **Identical Sidebar Naming**: Both the unverified lobby and verified arrivals lounge are named `#👋ㆍwelcome` for a seamless UI transition.
- **Ghost-Ping Onboarding**: Sends and immediately deletes a join notification to alert new arrivals.
- **💎 OG Member Automation**: The first 100 human members automatically receive the `💎ㆍOG Member` role (positioned directly above `@✈️ㆍVerified`).

---

### ⚖️ 7. Full Moderation & Quarantine Hub
- **Commands**: `/warn`, `/timeout`, `/untimeout`, `/kick`, `/softban`, `/ban`, `/unban`, `/clear`, `/full-kick`, `/troll`.
- **Temporary Quarantine Hub**: Suspends users into an isolated `#appeal-hub` while preserving roles.
- **Interactive DM Appeal System**: Users can submit appeals with Discord Modals; moderators can resolve with 1-click `Accept` or `Reject`.
- **Confidential Staff Logs (`#admin-logs`)**: Placed at the bottom of the Staff category, visible only to Administrators.

---

## 📁 Project Architecture

```
AviBot/
├── src/
│   ├── commands/
│   │   ├── moderation/       # /ban, /kick, /full-kick, /timeout, /warn, /clear, /troll, ...
│   │   ├── setup/            # /setup-server, /setup-verify, /post-rules
│   │   └── utility/          # /rank, /top-spotters, /top-chatters, /jetphotos-verify, /jetphotos, /ping, ...
│   ├── database/
│   │   └── db.js             # SQLite3 WAL Mode Database Backend
│   ├── events/
│   │   ├── ready.js          # Startup routine, role positions & slowmodes
│   │   ├── messageCreate.js  # Photo rating interceptor & Chat XP engine
│   │   ├── interactionCreate.js # Slash commands, buttons & select menus
│   │   └── guildMemberAdd.js # Ghost-ping & OG Member auto-grant
│   ├── handlers/             # Command & Event loaders
│   ├── services/
│   │   ├── geminiService.js       # Google Gemini Vision AI Image Classifier
│   │   ├── jetphotosService.js    # JetPhotos Ownership Verification
│   │   ├── rolePickerService.js   # Interactive Dropdown Role Engine
│   │   ├── verificationService.js # Anti-Bot Channel Lockdown
│   │   ├── adminLogService.js     # Confidential Admin Logging
│   │   ├── ogRoleService.js       # First 100 OG Member Sync
│   │   └── leaderboardService.js  # Multi-Interval Photo Ranking Engine
│   ├── utils/                # Level formulas, appeal helpers & photo cards
│   ├── workers/              # Background workers (leaderboards & punishments)
│   ├── config.js             # Global bot configuration
│   ├── deploy-commands.js    # Instant slash command registration
│   └── index.js              # Main application entry point
├── .env.example              # Environment template
├── .gitignore                # Secret & Database protection
└── package.json              # Dependencies and scripts
```

---

## 🚀 Setup & Installation

### 1. Prerequisites
- **Node.js**: `v20 LTS` or higher
- **Discord Bot Token** from [Discord Developer Portal](https://discord.com/developers/applications)
  - Enable **Guilds**, **Guild Members**, and **Message Content** Gateway Intents.
- **Google Gemini API Key** (Free) from [Google AI Studio](https://aistudio.google.com/app/apikey).

---

### 2. Configuration (`.env`)
Create a `.env` file in the root directory:

```env
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id
GUILD_ID=your_target_guild_id
GEMINI_API_KEY=your_google_gemini_api_key
```

---

### 3. Install & Start

```bash
# 1. Install dependencies
npm install

# 2. Deploy slash commands to Discord
npm run deploy-commands

# 3. Start the bot
npm start

# Or deploy & restart in one command:
npm run restart
```

---

## 🥧 24/7 Hosting on Raspberry Pi 5 (`systemd`)

AviBot is optimized for Linux ARM64 (Raspberry Pi 5):

```bash
# 1. Check live status
sudo systemctl status avibot

# 2. View live logs
journalctl -u avibot -f

# 3. Restart daemon
sudo systemctl restart avibot
```

---

## 📜 License
Distributed under the **MIT License**. Created with ❤️ for aviation & planespotting communities worldwide.

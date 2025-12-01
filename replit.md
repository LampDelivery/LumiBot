# Discord Bot

## Overview

This is a Discord bot built with Node.js and discord.js v14. The bot provides slash commands for image sharing, installation instructions, and a server-specific autoresponder system. It uses an Express server for health checks, PostgreSQL for persistent storage of autoresponders and scheduled Minky intervals.

## User Preferences

Preferred communication style: Simple, everyday language.

## Project Structure

```
├── src/
│   ├── index.js              # Main entry point - initializes client, loads handlers
│   ├── commands/             # Slash command files (one per command)
│   │   ├── minky.js          # Random Minky image command
│   │   ├── minkyinterval.js  # Schedule automatic Minky images
│   │   ├── stopminky.js      # Stop scheduled Minky images
│   │   ├── addresponder.js   # Add autoresponder (Admin)
│   │   ├── deleteresponder.js # Delete autoresponder (Admin)
│   │   ├── install.js        # Installation instructions
│   │   ├── setstatus.js      # Set bot status (Owner)
│   │   └── plugins.js        # Browse and search Aliucord plugins (Aliucord server only)
│   ├── events/               # Event handler files
│   │   ├── ready.js          # Bot ready/startup logic
│   │   ├── interactionCreate.js # Command & button interactions
│   │   ├── messageCreate.js  # Message autoresponders & DM handling
│   │   └── error.js          # Error handling
│   ├── handlers/             # Module loaders
│   │   ├── commandLoader.js  # Loads all commands from commands/
│   │   └── eventLoader.js    # Loads all events from events/
│   └── utils/                # Utility modules
│       ├── database.js       # PostgreSQL operations & data caching
│       ├── helpers.js        # Interval parsing, Minky image fetching
│       └── prefixParser.js   # Prefix command parsing utilities
├── package.json              # Dependencies and scripts
├── replit.md                 # Project documentation and changelog
└── README.md                 # Project documentation
```

## System Architecture

### Bot Framework
- **Technology**: discord.js v14 with slash commands
- **Rationale**: Modern Discord API interaction with built-in support for slash commands, embeds, and interactive components (buttons)
- **Gateway Intents**: Guilds, GuildMessages, MessageContent, and DirectMessages for monitoring server messages, responding to triggers, and handling DMs
- **DM Handling**: Responds to any direct message with a random Minky image

### Command System
- **Dual Command Support**: Both slash commands and prefix commands (`l!`) are supported
- **Slash Commands**: Native Discord slash command registration using REST API
- **Prefix Commands**: Text-based commands using `l!` prefix for quick input
- **Command Types**:
  - `/minky` or `l!minky` - Image sharing with file attachments
  - `/minkyinterval` or `l!minkyinterval <interval> <#channel>` - Admin-only command to schedule automatic Minky images
  - `/stopminky` or `l!stopminky <#channel>` - Admin-only command to stop scheduled Minky images
  - `/install` or `l!install` - Installation guide (Aliucord-specific, skips platform picker)
  - `/addresponder` or `l!addresponder <trigger> | <response> [#channel]` - Admin-only autoresponder creation
  - `/deleteresponder` or `l!deleteresponder <trigger>` - Admin-only autoresponder removal
  - `/setstatus` or `l!setstatus <online|idle|dnd> <message>` - Owner-only bot status
  - `/plugins [search]` or `l!plugins [search]` - Browse Aliucord plugins with pagination (Aliucord server only)
- **Permission Model**: Administrator permission checks enforced for autoresponder and Minky interval management. Owner-only checks for status management.

### Data Persistence
- **Database**: PostgreSQL with pg library (hosted on Neon or similar external service for Render deployment)
- **Tables**:
  - `autoresponders`: Stores guild_id, trigger_phrase, response, channel_id
  - `minky_intervals`: Stores guild_id, channel_id, interval_str, interval_ms
- **Loading**: Data is loaded from database on bot startup
- **Saving**: Data is saved to database when adding/modifying/deleting entries
- **Persistence**: All autoresponders and scheduled Minky intervals survive bot restarts

### Autoresponder Architecture
- **Storage**: PostgreSQL database with in-memory cache for fast access
- **Scope**: Server-specific (each Discord server maintains its own autoresponders)
- **Features**:
  - Case-insensitive trigger matching
  - Optional channel-specific restrictions
  - Trigger phrase and response message pairs
  - Persistent storage across restarts

### Interactive Components
- **Buttons**: Action rows with button builders for platform selection in `/install` command
- **Ephemeral Responses**: Private messages visible only to command invoker for installation instructions
- **Button Styles**: Used for visual distinction between options

### Authentication & Permissions
- **Bot Token**: Environment variable (`DISCORD_BOT_TOKEN`) for secure credential management
- **Owner ID**: Environment variable (`DISCORD_OWNER_ID`) for owner-only command access
- **Permission Checks**: Built-in Discord permission verification for administrative commands
- **Error Handling**: Process exits if token is not configured

### Runtime & Web Server
- **Runtime**: Node.js
- **Express Server**: Runs on port 3000 for health checks
- **Deployment**: Hosted on Render with PostgreSQL database via Neon

## External Dependencies

### Core Libraries
- **discord.js v14.25.1**: Discord API wrapper providing client, REST, gateway, and command builders
- **express v5.1.0**: Web framework for health endpoints
- **pg**: PostgreSQL client for Node.js, used for database persistence

### Discord API
- **Gateway Connection**: WebSocket connection for real-time event handling
- **REST API**: Slash command registration and interaction responses
- **Required Intents**: Guilds, GuildMessages, MessageContent

### Environment Variables
- **DISCORD_BOT_TOKEN**: Required authentication token for Discord bot API access
- **DISCORD_OWNER_ID**: Owner user ID for owner-only commands (setstatus)
- **DATABASE_URL**: PostgreSQL connection string (from Neon or external service)
- **PGDATABASE, PGHOST, PGPORT, PGUSER, PGPASSWORD**: Postgres connection details (used by DATABASE_URL)

### External Services
- **GitHub Releases**: Referenced in `/install` command for application downloads
  - KettuManager, KettuXposed, KettuTweak, BTLoader (Kettu server)
  - Aliucord Manager (Aliucord server)
- **Image Hosting**: External image URLs for Minky cat images (https://minky.materii.dev)
- **Neon**: PostgreSQL database hosting for Render deployment

## Deployment Configuration

### Render Deployment
- **Start Command**: `node src/index.js`
- **Runtime**: Node.js v22
- **Database**: Configured via DATABASE_URL environment variable
- **Port**: Express server on port 3000

### Configuration Files
- **.replit**: Replit environment configuration (excluded from git)
- **.gitignore**: Excludes .replit and replit.md from version control
- **Procfile**: Backup start command specification (optional)

## Changelog

### Recent Changes
- November 29, 2025: Added prefix command support (`l!`) alongside slash commands
- November 29, 2025: Refactored bot into modular architecture (commands/, events/, utils/, handlers/ folders)
- November 29, 2025: Deleted render.yaml (redundant with Render dashboard config)
- November 29, 2025: Cleared assets folder for cleanup
- November 29, 2025: Added /setstatus command (owner-only) for setting bot status and message
- November 29, 2025: Made /install command server-specific with Kettu and Aliucord variants
- November 29, 2025: Removed BotGhost status removal code (migrated to Render)
- November 29, 2025: Fixed database table schemas for Neon deployment
- November 29, 2025: Restructured project: moved index.js to src/ directory
- November 29, 2025: Switched Minky image delivery from embeds to file attachments
- November 29, 2025: Enhanced /minkyinterval to send immediate first Minky image upon setup
- November 29, 2025: Implemented automatic DM response feature with random Minky images
- November 29, 2025: Added /deleteresponder command (Admin only) to remove autoresponders
- November 29, 2025: Removed all emojis from /install command for minimal design
- November 29, 2025: Added GitHub release links to /install command
- November 29, 2025: Added /install command with interactive platform selection buttons
- November 29, 2025: Made autoresponders server-specific instead of global
- November 29, 2025: Added Administrator permission check for /addresponder
- November 29, 2025: Added autoresponder feature with /addresponder command
- November 29, 2025: Added /minky command with file attachment format
- November 29, 2025: Initial project setup with discord.js

### Import/Export Configuration Notes
- **Configuration consolidation**: changelog.md contents merged into replit.md for unified project documentation
- **Environment variables**: All secrets managed through Replit environment or Render dashboard (DISCORD_BOT_TOKEN, DISCORD_OWNER_ID, DATABASE_URL)
- **Database**: External PostgreSQL (Neon recommended) configured via DATABASE_URL
- **Version tracking**: All changes documented in Changelog section above for easy reference during config import/export

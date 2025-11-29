# Discord Bot

## Overview

This is a Discord bot built with Node.js and discord.js v14. The bot provides slash commands for image sharing, installation instructions, and a server-specific autoresponder system. It uses an Express server for health checks, PostgreSQL for persistent storage of autoresponders and scheduled Minky intervals.

## User Preferences

Preferred communication style: Simple, everyday language.

## Project Structure

```
├── src/
│   └── index.js          # Main bot code
├── assets/               # Screenshots and assets
├── package.json          # Dependencies and scripts
├── changelog.md          # Version history
└── README.md             # Project documentation
```

## System Architecture

### Bot Framework
- **Technology**: discord.js v14 with slash commands
- **Rationale**: Modern Discord API interaction with built-in support for slash commands, embeds, and interactive components (buttons)
- **Gateway Intents**: Guilds, GuildMessages, MessageContent, and DirectMessages for monitoring server messages, responding to triggers, and handling DMs
- **DM Handling**: Responds to any direct message with a random Minky image

### Command System
- **Slash Commands**: Native Discord slash command registration using REST API
- **Command Types**:
  - `/minky` - Image sharing with file attachments
  - `/minkyinterval` - Admin-only command to schedule automatic Minky images at set intervals (e.g., 30m, 1h, 6h, 1d). Sends an immediate first image when set up.
  - `/stopminky` - Admin-only command to stop scheduled Minky images for a channel
  - `/install` - Interactive installation guide with button-based platform selection (Android/iOS)
  - `/addresponder` - Admin-only command for creating autoresponders
  - `/deleteresponder` - Admin-only command for removing autoresponders
- **Permission Model**: Administrator permission checks enforced for autoresponder and Minky interval management

### Data Persistence
- **Database**: PostgreSQL with pg library
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
- **Permission Checks**: Built-in Discord permission verification for administrative commands
- **Error Handling**: Process exits if token is not configured

### Runtime & Web Server
- **Runtime**: Node.js
- **Express Server**: Included for potential health checks or webhook handling
- **Presence Management**: Custom bot status/activity configuration on ready event

## External Dependencies

### Core Libraries
- **discord.js v14.25.1**: Discord API wrapper providing client, REST, gateway, and command builders
- **express v5.1.0**: Web framework (likely for health endpoints or future webhook integration)
- **pg**: PostgreSQL client for Node.js, used for database persistence

### Discord API
- **Gateway Connection**: WebSocket connection for real-time event handling
- **REST API**: Slash command registration and interaction responses
- **Required Intents**: Guilds, GuildMessages, MessageContent

### Environment Variables
- **DISCORD_BOT_TOKEN**: Required authentication token for Discord bot API access

### External Services
- **GitHub Releases**: Referenced in `/install` command for application downloads (KettuManager, KettuXposed, KettuTweak, BTLoader)
- **Image Hosting**: External image URLs for Minky cat images (implementation details in full index.js)
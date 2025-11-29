# Discord Bot

## Overview

This is a Discord bot built with Node.js and discord.js v14. The bot provides slash commands for image sharing, installation instructions, and a server-specific autoresponder system. It uses an Express server (likely for health checks or webhook endpoints) and stores autoresponder configurations in memory.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Bot Framework
- **Technology**: discord.js v14 with slash commands
- **Rationale**: Modern Discord API interaction with built-in support for slash commands, embeds, and interactive components (buttons)
- **Gateway Intents**: Guilds, GuildMessages, and MessageContent for monitoring server messages and responding to triggers

### Command System
- **Slash Commands**: Native Discord slash command registration using REST API
- **Command Types**:
  - `/minky` - Image sharing with embedded responses (pink theme)
  - `/minkyinterval` - Admin-only command to schedule automatic Minky images at set intervals (e.g., 30m, 1h, 6h, 1d)
  - `/stopminky` - Admin-only command to stop scheduled Minky images for a channel
  - `/install` - Interactive installation guide with button-based platform selection (Android/iOS)
  - `/addresponder` - Admin-only command for creating autoresponders
  - `/deleteresponder` - Admin-only command for removing autoresponders
- **Permission Model**: Administrator permission checks enforced for autoresponder and Minky interval management

### Autoresponder Architecture
- **Storage**: In-memory storage using a JavaScript object keyed by guild ID
- **Scope**: Server-specific (each Discord server maintains its own autoresponders)
- **Features**:
  - Case-insensitive trigger matching
  - Optional channel-specific restrictions
  - Trigger phrase and response message pairs
- **Rationale**: In-memory storage chosen for simplicity; data is ephemeral and resets on bot restart
- **Trade-offs**: No persistence across restarts, but eliminates need for database infrastructure for simple use cases

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

### Discord API
- **Gateway Connection**: WebSocket connection for real-time event handling
- **REST API**: Slash command registration and interaction responses
- **Required Intents**: Guilds, GuildMessages, MessageContent

### Environment Variables
- **DISCORD_BOT_TOKEN**: Required authentication token for Discord bot API access

### External Services
- **GitHub Releases**: Referenced in `/install` command for application downloads (KettuManager, KettuXposed, KettuTweak, BTLoader)
- **Image Hosting**: External image URLs for Minky cat images (implementation details in full index.js)
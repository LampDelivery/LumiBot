# Discord Bot

## Overview
A simple Discord bot built with Node.js and discord.js 

## Project Structure
- `index.js` - Main bot entry point
- `package.json` - Project dependencies and scripts

### Slash Commands
- `/minky` - Get a random Minky cat image (displayed in pink embed)
- `/addresponder` - Add a new autoresponder with trigger phrase, response message, and optional channel restriction
- `/install` - Get Kettu installation instructions (ephemeral, interactive buttons for Android/iOS)

### Autoresponder
- Server-specific storage (each Discord server has its own autoresponders)
- In-memory storage keyed by guild ID
- Supports optional channel-specific restrictions
- Case-insensitive trigger matching
- Requires Administrator permissions to add

## Recent Changes
- November 29, 2025: Removed all emojis from /install command for minimal design
- November 29, 2025: Added GitHub release links to /install command (KettuManager, KettuXposed, KettuTweak, BTLoader)
- November 29, 2025: Added /install command with interactive platform selection buttons (Android/iOS) and ephemeral responses
- November 29, 2025: Made autoresponders server-specific instead of global
- November 29, 2025: Added Administrator permission check for /addresponder
- November 29, 2025: Added autoresponder feature with /addresponder command
- November 29, 2025: Added /minky command with embed format
- November 29, 2025: Initial project setup with discord.js

## User Preferences
- Node.js runtime
- discord.js library for Discord API interaction

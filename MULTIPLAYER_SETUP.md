# NEXUS ARENA - Multiplayer Setup Guide

Welcome to **NEXUS ARENA**, a browser-based multiplayer 3D combat game! This guide will help you set up and play with your friends.

## 🎮 Quick Start for Playing

### Prerequisites
- **Node.js** (version 14 or higher) - [Download here](https://nodejs.org/)
- A modern web browser (Chrome, Firefox, Edge, or Safari)
- Port 3000 available on your machine

### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```

3. **Open Your Browser**
   - The server will start at `http://localhost:3000`
   - Open this URL in your browser

4. **Create or Join a Room**
   - Enter your name and select a team
   - Click **CREATE ROOM** to host a game
   - Share the 6-character room code with friends
   - Friends can join by entering the room code and clicking **JOIN ROOM**

5. **Start Playing!**
   - Once everyone is in the waiting room, click **START GAME**
   - Enjoy multiplayer combat!

## 🌐 Playing with Friends

### Option 1: Local Network (Same WiFi)
If you and your friends are on the same WiFi network:

1. Find your local IP address:
   - **Windows**: Open Command Prompt and type `ipconfig`, look for "IPv4 Address"
   - **Mac/Linux**: Open Terminal and type `ifconfig` or `ip addr`, look for "inet"

2. Start the server with `npm start`

3. Share your IP address with friends:
   - Example: `http://192.168.1.100:3000`
   - Friends open this URL in their browsers

### Option 2: Internet Play (Different Networks)
To play with friends over the internet, you'll need to:

1. **Port Forward** on your router:
   - Forward port 3000 to your computer's local IP
   - Instructions vary by router model

2. **Share your public IP**:
   - Find your public IP at [whatismyipaddress.com](https://whatismyipaddress.com/)
   - Share `http://YOUR_PUBLIC_IP:3000` with friends

3. **Alternative: Use a Cloud Service**
   - Deploy to platforms like:
     - [Heroku](https://www.heroku.com/)
     - [Railway](https://railway.app/)
     - [Render](https://render.com/)
   - These provide a public URL automatically

## 🎯 Game Controls

| Control | Action |
|---------|--------|
| **W, A, S, D** | Move your character |
| **Mouse** | Aim direction |
| **Space** | Shoot |
| **P** | Open admin console |
| **ESC** | Pause game |

## 🏆 Game Features

### Teams
Choose from three factions:
- **Red Phoenix** - Red-colored team
- **Blue Wolves** - Blue-colored team
- **Green Dragons** - Green-colored team

### Multiplayer Features
- **Up to 4 players** per room
- **Real-time synchronization** of player positions and actions
- **Lobby system** with room codes
- **Player names** displayed above characters
- **Minimap** showing all players
- **Team-based gameplay**

### Progression System
- **Level up** by destroying rocks and AI enemies
- **Upgrades** available at each level:
  - Level 2: Fire Rate increase
  - Level 3: Damage increase
  - Level 4: Side Cannons
  - Level 5: Back Cannon
  - Level 6: Diagonal Cannons
  - Level 7+: Max Health increase

### Combat Mechanics
- **Health System**: 100 HP, gradually decays over time
- **Shooting**: Projectile-based combat
- **Upgrades**: Enhanced damage and fire rate
- **Extra Cannons**: Shoot in multiple directions

## 🛠️ Admin Console

Press **P** during gameplay to open the admin console.

### Available Commands

| Command | Description |
|---------|-------------|
| `nohealthdecay` or `godmode` | Toggle health decay on/off |
| `levelup [name]` | Level up yourself or a specific player/bot |
| `addbot [team]` | Add AI bot (red/blue/green) |
| `removebot [name]` | Remove a specific bot by name |
| `heal` | Restore your health to maximum |
| `help` | Show command list |

### Examples
```
nohealthdecay     # Disable health decay
levelup           # Level yourself up
addbot red        # Add red team AI bot
removebot Bot 123 # Remove specific bot
heal              # Heal to full health
```

## 🏗️ Technical Architecture

### Server (server.js)
- **WebSocket Server**: Real-time communication using `ws` library
- **Room Management**: Create and join rooms with 6-character codes
- **Player Synchronization**: Position, rotation, health, shooting events
- **Event Broadcasting**: Notify all players in a room of game events

### Client (index.html)
- **React**: UI and state management
- **Three.js**: 3D rendering and graphics
- **WebSocket Client**: Connects to server for multiplayer
- **States**: Lobby → Waiting Room → Playing

### Network Protocol
Messages sent between client and server:

**Client → Server:**
- `CREATE_ROOM` - Create new room
- `JOIN_ROOM` - Join existing room
- `LEAVE_ROOM` - Leave current room
- `PLAYER_UPDATE` - Position/health updates
- `PLAYER_SHOOT` - Shooting event
- `PLAYER_DAMAGE` - Damage taken
- `PLAYER_DEATH` - Death event
- `PLAYER_LEVEL_UP` - Level up event

**Server → Client:**
- `ROOM_CREATED` - Room creation confirmation
- `ROOM_JOINED` - Join confirmation
- `EXISTING_PLAYERS` - List of players in room
- `PLAYER_JOINED` - New player joined
- `PLAYER_LEFT` - Player left room
- `PLAYER_UPDATE` - Other player updates
- `PLAYER_SHOOT` - Other player shooting
- `ERROR` - Error messages

## 🐛 Troubleshooting

### Server won't start
- **Error: Port 3000 already in use**
  - Solution: Close other applications using port 3000
  - Or change the port: `PORT=3001 npm start`

### Can't connect to server
- **Check if server is running**
  - You should see "Server running on http://localhost:3000"
- **Firewall blocking**
  - Allow Node.js through your firewall
- **Wrong IP address**
  - Verify you're using the correct local/public IP

### Friends can't join room
- **Room code incorrect**
  - Room codes are case-sensitive
  - Verify the 6-character code
- **Network issues**
  - Ensure friends can ping your IP
  - Check port forwarding settings

### Game lags or stutters
- **Too many players**
  - Maximum 4 players per room
- **Slow network**
  - Check internet connection
  - Try local network play instead
- **Close other browser tabs**
  - Free up system resources

### Players not visible
- **Refresh the page**
  - Try reconnecting
- **Check console for errors**
  - Open browser DevTools (F12)
  - Look for WebSocket errors

## 📝 Development

### File Structure
```
sibling-shooting-game/
├── server.js           # WebSocket server
├── index.html          # Game client (React + Three.js)
├── package.json        # Dependencies
├── MULTIPLAYER_SETUP.md # This file
└── README.md           # General readme
```

### Adding Features
The codebase is modular and easy to extend:
- **New game mechanics**: Edit the game loop in index.html
- **New network events**: Add to server.js and client message handlers
- **UI changes**: Modify React components in index.html
- **3D graphics**: Update Three.js scene setup

## 🎨 Customization

### Change Teams
Edit the `teams` object in index.html:
```javascript
const teams = {
  red: { name: 'Red Phoenix', color: 0xff0044, glowColor: '#ff0044' },
  blue: { name: 'Blue Wolves', color: 0x0088ff, glowColor: '#0088ff' },
  green: { name: 'Green Dragons', color: 0x00ff88, glowColor: '#00ff88' }
};
```

### Adjust Arena Size
In the game initialization:
```javascript
const floorGeometry = new THREE.PlaneGeometry(100, 100, 50, 50); // Change 100 to desired size
```

### Modify Player Count
In server.js, change the room limit:
```javascript
if (room.getPlayerCount() >= 4) {  // Change 4 to desired max players
```

## 🚀 Deployment Options

### Heroku
1. Create a Heroku account
2. Install Heroku CLI
3. Run:
   ```bash
   heroku create your-game-name
   git push heroku main
   ```

### Railway
1. Connect your GitHub repository
2. Railway auto-detects Node.js
3. Deploy with one click

### Render
1. Create new Web Service
2. Connect repository
3. Build command: `npm install`
4. Start command: `npm start`

## 🤝 Tips for Best Experience

1. **Use headphones** for better spatial awareness
2. **Communicate with teammates** via voice chat (Discord, etc.)
3. **Share upgrade strategies** - coordinate team builds
4. **Practice movement** - master WASD controls
5. **Use the minimap** - track enemy positions
6. **Experiment with upgrades** - try different builds

## 📞 Support

If you encounter issues:
1. Check this troubleshooting guide
2. Review the browser console (F12) for errors
3. Ensure your browser and Node.js are up to date
4. Try a different browser

## 🎉 Have Fun!

Enjoy playing NEXUS ARENA with your friends! May the best team win!

---

**Version**: 1.0.0
**Last Updated**: 2025-12-18
**Players Supported**: 1-4 per room

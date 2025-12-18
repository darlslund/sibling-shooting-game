# Sibling Shooting Game

A top-down shooter game with human characters, grass terrain, and mouse-controlled aiming!

## 🎮 How to Play

### Quick Start
1. Run the local server:
   ```bash
   python3 serve.py
   ```
2. Open your browser to: `http://localhost:8000`
3. Enter your name, pick a team, and start playing!

### Controls
- **WASD** - Move your character
- **MOUSE** - Aim (character always faces cursor)
- **SPACE** - Shoot towards mouse position
- **P** - Open Admin Console
- **ESC** - Pause game

## 🎯 Game Features

### Core Mechanics
- ✅ Grass ground with realistic texture
- ✅ Small human figure characters (not spaceships!)
- ✅ Mouse-controlled aiming and shooting
- ✅ Death/elimination animation (character falls and sinks)
- ✅ Level-up system with 3 upgrade choices
- ✅ Health decay system (can be disabled)
- ✅ AI bot enemies with different behaviors

### Admin Console (Press P)
Access powerful admin commands to customize your game:

| Command | Description |
|---------|-------------|
| `nohealthdecay` or `godmode` | Toggle health decay on/off |
| `levelup [name]` | Grant level up to yourself or bot by name |
| `addbot [team]` | Add a bot (teams: red, blue, green) |
| `removebot [name]` | Remove bot by name or last bot |
| `heal` | Restore player health to max |
| `help` | Show command list in console |

### Example Admin Commands
```
godmode              # Disable health decay
levelup              # Level yourself up
levelup player 1     # Level up a specific bot
addbot red           # Add a red team bot
addbot               # Add a random team bot
removebot player 1   # Remove specific bot
heal                 # Restore full health
```

## 🤝 Multiplayer

Currently the game is **single-player** with AI bots.

**Want to play with friends/siblings?** See [MULTIPLAYER.md](MULTIPLAYER.md) for options to play together in the same lobby!

## 📁 Project Structure

```
├── index.html       # Main HTML file (loads the game)
├── game.jsx         # React game component
├── serve.py         # Local development server
├── README.md        # This file
└── MULTIPLAYER.md   # Multiplayer setup guide
```

## 🛠️ Technical Details

- **Framework**: React (loaded via CDN)
- **3D Graphics**: Three.js
- **Style**: Procedurally generated grass texture
- **Characters**: Custom 3D human models
- **Aiming**: Raycasting for mouse-to-world positioning

## 🎨 Teams

Choose from three factions:
- 🔴 **Red Phoenix**
- 🔵 **Blue Wolves**
- 🟢 **Green Dragons**

## 📝 Notes

- Health decays over time by default (use admin console to disable)
- Destroy rocks and enemies to gain XP
- Level up to unlock powerful upgrades
- Character always faces where you're aiming

Enjoy the game! 🎮

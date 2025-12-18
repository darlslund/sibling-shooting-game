# How to Play with Your Sisters (Multiplayer Setup)

Currently, the game is **single-player** with AI bots. To play together with your sisters in the same lobby, you have a few options:

## Option 1: Hot Seat (Same Computer)
Take turns on the same computer. Each player creates their character and plays while others watch. Use the admin console to make it more fun!

## Option 2: Local Network Play (Recommended for Playing Together)
To actually play together in real-time, you would need to add multiplayer functionality. Here's what this would involve:

### Required Implementation:
1. **WebSocket Server** - For real-time communication between players
2. **Player Synchronization** - Share positions, rotations, shooting
3. **Lobby System** - Room creation and joining
4. **Network Code** - Handle latency and prediction

### Quick Multiplayer Setup (If you want me to implement it):
I can add a simple multiplayer system using:
- **Socket.io** for real-time communication
- **Node.js server** to host the game
- **Lobby system** where one person creates a room and shares a code
- All players see each other and can fight together

This would require:
- Running a local server on one computer
- Other players connecting to that computer's IP address on the same WiFi network

## Option 3: Play Side-by-Side (Multiple Computers/Tabs)
Each person opens the game in their own browser and plays separately. You can:
- See who gets the highest score
- Race to reach certain levels
- Complete challenges

## What Would You Prefer?
Let me know if you'd like me to implement full multiplayer! It would allow you and your sisters to:
- ✅ See each other's characters in real-time
- ✅ Fight together against bots
- ✅ Compete or team up
- ✅ Use the admin console together
- ✅ Join the same game lobby with a room code

Just say "add multiplayer" and I'll implement a complete networked multiplayer system!

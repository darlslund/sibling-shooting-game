const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files (index.html)
app.use(express.static('.'));

// Game state
const rooms = new Map(); // roomCode -> Room
const clients = new Map(); // ws -> ClientInfo

// Generate random 6-character room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing characters
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Room structure
class Room {
  constructor(code, hostId) {
    this.code = code;
    this.hostId = hostId;
    this.players = new Map(); // playerId -> PlayerData
    this.createdAt = Date.now();
  }

  addPlayer(playerId, playerData) {
    this.players.set(playerId, playerData);
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  getPlayerCount() {
    return this.players.size;
  }

  broadcast(message, excludeId = null) {
    this.players.forEach((player, playerId) => {
      if (playerId !== excludeId && player.ws && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(message));
      }
    });
  }

  broadcastToAll(message) {
    this.broadcast(message, null);
  }
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('New client connected');

  const clientInfo = {
    id: Date.now() + Math.random(),
    ws: ws,
    roomCode: null,
    playerId: null
  };

  clients.set(ws, clientInfo);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(ws, clientInfo, data);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    handleDisconnect(ws, clientInfo);
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function handleMessage(ws, clientInfo, data) {
  const { type } = data;

  switch (type) {
    case 'CREATE_ROOM':
      handleCreateRoom(ws, clientInfo, data);
      break;

    case 'JOIN_ROOM':
      handleJoinRoom(ws, clientInfo, data);
      break;

    case 'LEAVE_ROOM':
      handleLeaveRoom(ws, clientInfo);
      break;

    case 'PLAYER_UPDATE':
      handlePlayerUpdate(ws, clientInfo, data);
      break;

    case 'PLAYER_SHOOT':
      handlePlayerShoot(ws, clientInfo, data);
      break;

    case 'PLAYER_DAMAGE':
      handlePlayerDamage(ws, clientInfo, data);
      break;

    case 'PLAYER_DEATH':
      handlePlayerDeath(ws, clientInfo, data);
      break;

    case 'PLAYER_LEVEL_UP':
      handlePlayerLevelUp(ws, clientInfo, data);
      break;

    case 'CHAT_MESSAGE':
      handleChatMessage(ws, clientInfo, data);
      break;

    default:
      console.log('Unknown message type:', type);
  }
}

function handleCreateRoom(ws, clientInfo, data) {
  const roomCode = generateRoomCode();
  const playerId = clientInfo.id;

  const room = new Room(roomCode, playerId);
  const playerData = {
    ws: ws,
    id: playerId,
    name: data.playerName || 'Player',
    team: data.team || 'Red Phoenix',
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    health: 100,
    level: 1,
    xp: 0,
    upgrades: {}
  };

  room.addPlayer(playerId, playerData);
  rooms.set(roomCode, room);

  clientInfo.roomCode = roomCode;
  clientInfo.playerId = playerId;

  ws.send(JSON.stringify({
    type: 'ROOM_CREATED',
    roomCode: roomCode,
    playerId: playerId
  }));

  console.log(`Room created: ${roomCode} by player ${playerId}`);
}

function handleJoinRoom(ws, clientInfo, data) {
  const { roomCode, playerName, team } = data;
  const room = rooms.get(roomCode);

  if (!room) {
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: 'Room not found'
    }));
    return;
  }

  if (room.getPlayerCount() >= 4) {
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: 'Room is full (max 4 players)'
    }));
    return;
  }

  const playerId = clientInfo.id;
  const playerData = {
    ws: ws,
    id: playerId,
    name: playerName || 'Player',
    team: team || 'Red Phoenix',
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    health: 100,
    level: 1,
    xp: 0,
    upgrades: {}
  };

  room.addPlayer(playerId, playerData);
  clientInfo.roomCode = roomCode;
  clientInfo.playerId = playerId;

  // Send join confirmation to the new player
  ws.send(JSON.stringify({
    type: 'ROOM_JOINED',
    roomCode: roomCode,
    playerId: playerId
  }));

  // Send existing players to new player
  const existingPlayers = [];
  room.players.forEach((player, id) => {
    if (id !== playerId) {
      existingPlayers.push({
        id: player.id,
        name: player.name,
        team: player.team,
        position: player.position,
        rotation: player.rotation,
        health: player.health,
        level: player.level,
        xp: player.xp,
        upgrades: player.upgrades
      });
    }
  });

  ws.send(JSON.stringify({
    type: 'EXISTING_PLAYERS',
    players: existingPlayers
  }));

  // Notify other players about new player
  room.broadcast({
    type: 'PLAYER_JOINED',
    player: {
      id: playerId,
      name: playerData.name,
      team: playerData.team,
      position: playerData.position,
      rotation: playerData.rotation,
      health: playerData.health,
      level: playerData.level,
      xp: playerData.xp,
      upgrades: playerData.upgrades
    }
  }, playerId);

  console.log(`Player ${playerId} (${playerName}) joined room ${roomCode}`);
}

function handleLeaveRoom(ws, clientInfo) {
  const { roomCode, playerId } = clientInfo;

  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (room) {
    room.removePlayer(playerId);

    // Notify other players
    room.broadcast({
      type: 'PLAYER_LEFT',
      playerId: playerId
    });

    // Delete room if empty
    if (room.getPlayerCount() === 0) {
      rooms.delete(roomCode);
      console.log(`Room ${roomCode} deleted (empty)`);
    }
  }

  clientInfo.roomCode = null;
  clientInfo.playerId = null;
}

function handleDisconnect(ws, clientInfo) {
  handleLeaveRoom(ws, clientInfo);
}

function handlePlayerUpdate(ws, clientInfo, data) {
  const { roomCode, playerId } = clientInfo;

  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player) return;

  // Update player state
  if (data.position) player.position = data.position;
  if (data.rotation !== undefined) player.rotation = data.rotation;
  if (data.health !== undefined) player.health = data.health;
  if (data.level !== undefined) player.level = data.level;
  if (data.xp !== undefined) player.xp = data.xp;
  if (data.upgrades) player.upgrades = data.upgrades;

  // Broadcast to other players
  room.broadcast({
    type: 'PLAYER_UPDATE',
    playerId: playerId,
    position: player.position,
    rotation: player.rotation,
    health: player.health,
    level: player.level,
    xp: player.xp,
    upgrades: player.upgrades
  }, playerId);
}

function handlePlayerShoot(ws, clientInfo, data) {
  const { roomCode, playerId } = clientInfo;

  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  // Broadcast shoot event to other players
  room.broadcast({
    type: 'PLAYER_SHOOT',
    playerId: playerId,
    position: data.position,
    direction: data.direction,
    projectileId: data.projectileId
  }, playerId);
}

function handlePlayerDamage(ws, clientInfo, data) {
  const { roomCode, playerId } = clientInfo;

  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  // Broadcast damage event
  room.broadcast({
    type: 'PLAYER_DAMAGE',
    playerId: playerId,
    damage: data.damage,
    health: data.health,
    attackerId: data.attackerId
  }, playerId);
}

function handlePlayerDeath(ws, clientInfo, data) {
  const { roomCode, playerId } = clientInfo;

  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  // Broadcast death event
  room.broadcast({
    type: 'PLAYER_DEATH',
    playerId: playerId,
    killerId: data.killerId
  }, playerId);
}

function handlePlayerLevelUp(ws, clientInfo, data) {
  const { roomCode, playerId } = clientInfo;

  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player) return;

  player.level = data.level;
  player.xp = data.xp;
  player.upgrades = data.upgrades;

  // Broadcast level up event
  room.broadcast({
    type: 'PLAYER_LEVEL_UP',
    playerId: playerId,
    level: data.level,
    xp: data.xp,
    upgrades: data.upgrades
  }, playerId);
}

function handleChatMessage(ws, clientInfo, data) {
  const { roomCode, playerId } = clientInfo;

  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player) return;

  // Broadcast chat message
  room.broadcastToAll({
    type: 'CHAT_MESSAGE',
    playerId: playerId,
    playerName: player.name,
    message: data.message
  });
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║     NEXUS ARENA MULTIPLAYER SERVER           ║
╚═══════════════════════════════════════════════╝

Server running on http://localhost:${PORT}

WebSocket server is ready for connections.
Players can create or join rooms to play together!

Press Ctrl+C to stop the server.
  `);
});

// Cleanup old rooms (optional)
setInterval(() => {
  const now = Date.now();
  const MAX_ROOM_AGE = 24 * 60 * 60 * 1000; // 24 hours

  rooms.forEach((room, code) => {
    if (room.getPlayerCount() === 0 && (now - room.createdAt) > MAX_ROOM_AGE) {
      rooms.delete(code);
      console.log(`Cleaned up old empty room: ${code}`);
    }
  });
}, 60 * 60 * 1000); // Check every hour

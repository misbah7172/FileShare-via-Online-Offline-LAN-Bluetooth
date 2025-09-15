const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const LANDiscovery = require('./lan-discovery');
const FTPServer = require('./ftp-server');

// Load environment variables from parent directory
require('dotenv').config({ path: '../.env' });

const app = express();
const server = http.createServer(app);

// Initialize LAN Discovery
const lanDiscovery = new LANDiscovery(process.env.PORT || 3001);

// Initialize FTP Server
const ftpServer = new FTPServer();

// Configure CORS
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://192.168.200.1:3000",
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true
};

app.use(cors(corsOptions));
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for development
}));
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
}

// LAN Discovery API endpoints
app.get('/api/lan/devices', (req, res) => {
  try {
    const devices = lanDiscovery.getDiscoveredDevices();
    res.json({
      success: true,
      devices,
      localDevice: lanDiscovery.deviceInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/lan/discover', (req, res) => {
  try {
    lanDiscovery.discoverDevices();
    res.json({
      success: true,
      message: 'Discovery broadcast sent'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/connectivity', (req, res) => {
  const dns = require('dns');
  dns.lookup('google.com', (err) => {
    res.json({
      hasInternet: !err,
      lanDevices: lanDiscovery.getDiscoveredDevices().length,
      timestamp: Date.now()
    });
  });
});

app.get('/api/device-info', (req, res) => {
  res.json({
    success: true,
    device: lanDiscovery.deviceInfo
  });
});

// Configure Socket.IO
const io = socketIo(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
});

// Room management
const rooms = new Map();
const userNames = new Map(); // socketId -> userName
const roomPasswords = new Map(); // roomId -> password

// Generate random animal names for users
const animals = [
  'Aardvark', 'Albatross', 'Alligator', 'Alpaca', 'Ant', 'Anteater', 'Antelope',
  'Ape', 'Armadillo', 'Baboon', 'Badger', 'Barracuda', 'Bat', 'Bear', 'Beaver',
  'Bee', 'Bison', 'Boar', 'Buffalo', 'Butterfly', 'Camel', 'Capybara', 'Caribou',
  'Cassowary', 'Cat', 'Caterpillar', 'Cattle', 'Chamois', 'Cheetah', 'Chicken',
  'Chimpanzee', 'Chinchilla', 'Chough', 'Clam', 'Cobra', 'Cockroach', 'Cod',
  'Cormorant', 'Coyote', 'Crab', 'Crane', 'Crocodile', 'Crow', 'Curlew',
  'Deer', 'Dinosaur', 'Dog', 'Dogfish', 'Dolphin', 'Dotterel', 'Dove', 'Dragonfly',
  'Duck', 'Dugong', 'Dunlin', 'Eagle', 'Echidna', 'Eel', 'Eland', 'Elephant',
  'Elk', 'Emu', 'Falcon', 'Ferret', 'Finch', 'Fish', 'Flamingo', 'Fly',
  'Fox', 'Frog', 'Gaur', 'Gazelle', 'Gerbil', 'Giraffe', 'Gnat', 'Gnu',
  'Goat', 'Goldfinch', 'Goldfish', 'Goose', 'Gorilla', 'Goshawk', 'Grasshopper',
  'Grouse', 'Guanaco', 'Gull', 'Hamster', 'Hare', 'Hawk', 'Hedgehog',
  'Heron', 'Herring', 'Hippopotamus', 'Hornet', 'Horse', 'Human', 'Hummingbird',
  'Hyena', 'Ibex', 'Ibis', 'Jackal', 'Jaguar', 'Jay', 'Jellyfish', 'Kangaroo',
  'Kingfisher', 'Koala', 'Kookabura', 'Kouprey', 'Kudu', 'Lapwing', 'Lark',
  'Lemur', 'Leopard', 'Lion', 'Llama', 'Lobster', 'Locust', 'Loris', 'Louse',
  'Lyrebird', 'Magpie', 'Mallard', 'Manatee', 'Mandrill', 'Mantis', 'Marten',
  'Meerkat', 'Mink', 'Mole', 'Mongoose', 'Monkey', 'Moose', 'Mosquito', 'Mouse',
  'Mule', 'Narwhal', 'Newt', 'Nightingale', 'Octopus', 'Okapi', 'Opossum',
  'Oryx', 'Ostrich', 'Otter', 'Owl', 'Oyster', 'Panther', 'Parrot', 'Partridge',
  'Peafowl', 'Pelican', 'Penguin', 'Pheasant', 'Pig', 'Pigeon', 'Pony',
  'Porcupine', 'Porpoise', 'Quail', 'Quelea', 'Quetzal', 'Rabbit', 'Raccoon',
  'Rail', 'Ram', 'Rat', 'Raven', 'Reindeer', 'Rhinoceros', 'Rook', 'Salamander',
  'Salmon', 'Sandpiper', 'Sardine', 'Scorpion', 'Seahorse', 'Seal', 'Shark',
  'Sheep', 'Shrew', 'Skunk', 'Snail', 'Snake', 'Sparrow', 'Spider', 'Spoonbill',
  'Squid', 'Squirrel', 'Starling', 'Stingray', 'Stinkbug', 'Stork', 'Swallow',
  'Swan', 'Tapir', 'Tarsier', 'Termite', 'Tiger', 'Toad', 'Trout', 'Turkey',
  'Turtle', 'Viper', 'Vulture', 'Wallaby', 'Walrus', 'Wasp', 'Weasel', 'Whale',
  'Wildcat', 'Wolf', 'Wolverine', 'Wombat', 'Woodcock', 'Woodpecker', 'Worm',
  'Wren', 'Yak', 'Zebra'
];

const colors = [
  'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Indigo', 'Violet', 'Pink',
  'Brown', 'Black', 'White', 'Gray', 'Silver', 'Gold', 'Crimson', 'Maroon',
  'Coral', 'Salmon', 'Lime', 'Olive', 'Navy', 'Teal', 'Aqua', 'Fuchsia',
  'Purple', 'Magenta', 'Cyan', 'Turquoise', 'Lavender', 'Beige', 'Tan',
  'Khaki', 'Ivory', 'Azure', 'Mint', 'Jade', 'Emerald', 'Ruby', 'Amber',
  'Pearl', 'Copper', 'Bronze', 'Platinum', 'Rose', 'Peach', 'Apricot'
];

function generateRandomName() {
  const color = colors[Math.floor(Math.random() * colors.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${color} ${animal}`;
}

function generateRoomId() {
  // Generate a 6-character room ID using crypto
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Clean up empty rooms periodically
setInterval(() => {
  for (const [roomId, users] of rooms.entries()) {
    if (users.size === 0) {
      rooms.delete(roomId);
      roomPasswords.delete(roomId);
      console.log(`Cleaned up empty room: ${roomId}`);
    }
  }
}, parseInt(process.env.ROOM_CLEANUP_INTERVAL) || 3600000); // 1 hour default

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);
  
  // Generate random name for user
  const userName = generateRandomName();
  userNames.set(socket.id, userName);
  console.log(`👤 Generated name for ${socket.id}: ${userName}`);

  // Test connection handler
  socket.on('test-connection', (data) => {
    console.log('🧪 TEST CONNECTION received from', socket.id, ':', data);
    socket.emit('test-response', { message: 'Server received your test!' });
  });

  // Room creation
  socket.on('create-room', async (data) => {
    console.log(`🏠 Create room request from ${socket.id}:`, data);
    const { password } = data || {};
    const roomId = generateRoomId();
    
    // Store room password if provided
    if (password) {
      roomPasswords.set(roomId, hashPassword(password));
      console.log(`🔒 Room ${roomId} created with password protection`);
    }
    
    // Create room and add user
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    
    socket.join(roomId);
    rooms.get(roomId).add(socket.id);
    
    // Notify user of successful room creation
    const responseData = {
      roomId,
      userName: userNames.get(socket.id),
      hasPassword: !!password
    };
    console.log(`📤 Sending room-created event:`, responseData);
    socket.emit('room-created', responseData);
    
    // Broadcast to other users in room
    socket.to(roomId).emit('user-joined', {
      userId: socket.id,
      userName: userNames.get(socket.id),
      userCount: rooms.get(roomId).size
    });
    
    console.log(`✅ Room ${roomId} created by ${socket.id} (${userName})`);
  });

  socket.on('join-room', (data) => {
    const { roomId, password } = data;
    
    if (!rooms.has(roomId)) {
      socket.emit('room-error', { message: 'Room not found' });
      return;
    }
    
    // Check password if room is protected
    if (roomPasswords.has(roomId)) {
      if (!password || hashPassword(password) !== roomPasswords.get(roomId)) {
        socket.emit('room-error', { message: 'Invalid password' });
        return;
      }
    }
    
    // Check room size limit
    const maxRoomSize = parseInt(process.env.MAX_ROOM_SIZE) || 10;
    if (rooms.get(roomId).size >= maxRoomSize) {
      socket.emit('room-error', { message: 'Room is full' });
      return;
    }
    
    socket.join(roomId);
    rooms.get(roomId).add(socket.id);
    
    // Get all users in room
    const usersInRoom = Array.from(rooms.get(roomId)).map(userId => ({
      userId,
      userName: userNames.get(userId),
      isCurrentUser: userId === socket.id
    }));
    
    // Notify user of successful join
    socket.emit('room-joined', {
      roomId,
      userName: userNames.get(socket.id),
      users: usersInRoom,
      userCount: rooms.get(roomId).size
    });
    
    // Notify other users
    socket.to(roomId).emit('user-joined', {
      userId: socket.id,
      userName: userNames.get(socket.id),
      userCount: rooms.get(roomId).size
    });
    
    console.log(`User ${socket.id} (${userNames.get(socket.id)}) joined room ${roomId}`);
  });

  socket.on('change-name', (data) => {
    const { newName, roomId } = data;
    const oldName = userNames.get(socket.id);
    userNames.set(socket.id, newName);
    
    if (roomId && rooms.has(roomId) && rooms.get(roomId).has(socket.id)) {
      socket.to(roomId).emit('user-name-changed', {
        userId: socket.id,
        oldName,
        newName
      });
      
      socket.emit('name-changed', { newName });
    }
    
    console.log(`User ${socket.id} changed name from ${oldName} to ${newName}`);
  });

  // WebRTC signaling
  socket.on('offer', (data) => {
    const { targetUserId, offer, roomId } = data;
    socket.to(targetUserId).emit('offer', {
      fromUserId: socket.id,
      fromUserName: userNames.get(socket.id),
      offer,
      roomId
    });
  });

  socket.on('answer', (data) => {
    const { targetUserId, answer, roomId } = data;
    socket.to(targetUserId).emit('answer', {
      fromUserId: socket.id,
      fromUserName: userNames.get(socket.id),
      answer,
      roomId
    });
  });

  socket.on('ice-candidate', (data) => {
    const { targetUserId, candidate, roomId } = data;
    socket.to(targetUserId).emit('ice-candidate', {
      fromUserId: socket.id,
      candidate,
      roomId
    });
  });

  // File transfer events
  socket.on('file-transfer-request', (data) => {
    const { targetUserId, fileName, fileSize, fileType, transferId, roomId } = data;
    socket.to(targetUserId).emit('file-transfer-request', {
      fromUserId: socket.id,
      fromUserName: userNames.get(socket.id),
      fileName,
      fileSize,
      fileType,
      transferId,
      roomId
    });
  });

  socket.on('file-transfer-response', (data) => {
    const { targetUserId, transferId, accepted, roomId } = data;
    socket.to(targetUserId).emit('file-transfer-response', {
      fromUserId: socket.id,
      transferId,
      accepted,
      roomId
    });
  });

  socket.on('file-transfer-progress', (data) => {
    const { targetUserId, transferId, progress, roomId } = data;
    socket.to(targetUserId).emit('file-transfer-progress', {
      fromUserId: socket.id,
      transferId,
      progress,
      roomId
    });
  });

  socket.on('file-transfer-complete', (data) => {
    const { targetUserId, transferId, roomId } = data;
    socket.to(targetUserId).emit('file-transfer-complete', {
      fromUserId: socket.id,
      transferId,
      roomId
    });
  });

  socket.on('file-transfer-error', (data) => {
    const { targetUserId, transferId, error, roomId } = data;
    socket.to(targetUserId).emit('file-transfer-error', {
      fromUserId: socket.id,
      transferId,
      error,
      roomId
    });
  });

  // LAN Discovery Events
  socket.on('discover-lan-devices', async () => {
    console.log(`🔍 LAN discovery request from ${socket.id}`);
    try {
      // Trigger device discovery
      lanDiscovery.discoverDevices();
      
      // Wait a bit for responses and send current devices
      setTimeout(() => {
        const devices = lanDiscovery.getDiscoveredDevices();
        socket.emit('lan-devices-discovered', {
          devices,
          localDevice: lanDiscovery.deviceInfo
        });
      }, 2000);
    } catch (error) {
      console.error('🔍 LAN discovery error:', error);
      socket.emit('lan-discovery-error', { message: error.message });
    }
  });

  socket.on('get-lan-devices', () => {
    const devices = lanDiscovery.getDiscoveredDevices();
    socket.emit('lan-devices-list', {
      devices,
      localDevice: lanDiscovery.deviceInfo
    });
  });

  socket.on('check-connectivity', () => {
    // Check if we have internet connectivity
    const dns = require('dns');
    dns.lookup('google.com', (err) => {
      socket.emit('connectivity-status', {
        hasInternet: !err,
        timestamp: Date.now()
      });
    });
  });

  socket.on('create-lan-room', (data) => {
    const { password, roomName } = data || {};
    const roomId = generateRoomId();
    
    // Store room password if provided
    if (password) {
      roomPasswords.set(roomId, hashPassword(password));
    }
    
    // Create room and add user
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    
    socket.join(roomId);
    rooms.get(roomId).add(socket.id);
    
    const responseData = {
      roomId,
      roomName: roomName || `LAN Room ${roomId}`,
      userName: userNames.get(socket.id),
      hasPassword: !!password,
      isLANRoom: true
    };
    
    socket.emit('lan-room-created', responseData);
    
    // Broadcast room info to LAN (this would be enhanced for true LAN broadcasting)
    socket.broadcast.emit('lan-room-available', {
      roomId,
      roomName: responseData.roomName,
      hasPassword: !!password,
      host: lanDiscovery.deviceInfo.hostname,
      deviceId: lanDiscovery.deviceInfo.deviceId
    });
    
    console.log(`🏠🔍 LAN Room ${roomId} created by ${socket.id} (${userNames.get(socket.id)})`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    
    // Remove user from all rooms
    for (const [roomId, users] of rooms.entries()) {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        
        // Notify other users in room
        socket.to(roomId).emit('user-left', {
          userId: socket.id,
          userName: userNames.get(socket.id),
          userCount: users.size
        });
        
        // Clean up empty room
        if (users.size === 0) {
          rooms.delete(roomId);
          roomPasswords.delete(roomId);
          console.log(`🧹 Cleaned up empty room: ${roomId}`);
        }
      }
    }
    
    // Clean up user data
    userNames.delete(socket.id);
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    rooms: rooms.size,
    connections: io.engine.clientsCount,
    timestamp: new Date().toISOString()
  });
});

// Get room info endpoint
app.get('/api/room/:roomId', (req, res) => {
  const { roomId } = req.params;
  
  if (!rooms.has(roomId)) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({
    roomId,
    userCount: rooms.get(roomId).size,
    hasPassword: roomPasswords.has(roomId),
    maxUsers: parseInt(process.env.MAX_ROOM_SIZE) || 10
  });
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
  });
}

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces

// Start server with LAN discovery
async function startServer() {
  try {
    // Initialize LAN discovery
    await lanDiscovery.start();
    console.log('🔍 LAN Discovery initialized');
    
    // Start the main server
    server.listen(PORT, HOST, () => {
      console.log(`FileShare server running on ${HOST}:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`CORS Origins:`, corsOptions.origin);
      console.log(`Server accessible at:`);
      console.log(`  - Local: http://localhost:${PORT}`);
      console.log(`  - Network: http://192.168.200.1:${PORT}`);
      console.log(`🔍 LAN Discovery active on UDP port 3002`);
      console.log(`📱 Device ID: ${lanDiscovery.deviceInfo.deviceId}`);
      console.log(`🏠 Hostname: ${lanDiscovery.deviceInfo.hostname}`);
      
      // Start FTP Server
      ftpServer.start(3003);
      
      // Start discovering devices after server is up
      setTimeout(() => {
        lanDiscovery.discoverDevices();
        console.log('🔍 Initial LAN device discovery started');
      }, 1000);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  lanDiscovery.stop();
  ftpServer.stop();
  server.close(() => {
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  lanDiscovery.stop();
  ftpServer.stop();
  server.close(() => {
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  });
});

startServer();

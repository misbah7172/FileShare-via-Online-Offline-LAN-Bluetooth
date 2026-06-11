const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cors = require('cors');

class FTPServer {
  constructor(app = null) {
    this.activeRooms = new Map(); // roomId -> { password, files, members, messages, createdAt, lastAccess }
    this.uploadDir = path.join(__dirname, 'uploads');
    
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    // Configure multer for file uploads
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const roomId = req.params.roomId;
        const roomDir = path.join(this.uploadDir, roomId);
        if (!fs.existsSync(roomDir)) {
          fs.mkdirSync(roomDir, { recursive: true });
        }
        cb(null, roomDir);
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, `${timestamp}-${originalName}`);
      }
    });

    this.upload = multer({ 
      storage,
      limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
      }
    });

    if (app) {
      this.setupRoutes(app);
    }
  }

  setupRoutes(app) {
    const router = express.Router();

    // Create a new FTP room
    router.post('/create-room', (req, res) => {
      try {
        const { password, roomName } = req.body;
        const roomId = this.generateRoomId();
        
        const room = {
          id: roomId,
          name: roomName || `Remote Room ${roomId}`,
          password: password || '',
          files: [],
          members: new Map(), // socketId -> { name, lastSeen }
          messages: [],
          createdAt: new Date(),
          lastAccess: new Date(),
          type: 'ftp'
        };

        this.activeRooms.set(roomId, room);

        res.json({
          success: true,
          roomId,
          roomName: room.name,
          message: 'Remote room created successfully'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Failed to create room',
          error: error.message
        });
      }
    });

    // Join/Access FTP room (also registers member)
    router.post('/join/:roomId', (req, res) => {
      try {
        const { roomId } = req.params;
        const { password, userName, userId } = req.body;

        const room = this.activeRooms.get(roomId);
        
        if (!room) {
          return res.status(404).json({
            success: false,
            message: 'Room not found'
          });
        }

        if (room.password && room.password !== password) {
          return res.status(401).json({
            success: false,
            message: 'Invalid password'
          });
        }

        // Add or update member
        if (userId) {
          room.members.set(userId, {
            name: userName || 'Anonymous',
            lastSeen: new Date()
          });
        }

        room.lastAccess = new Date();

        res.json({
          success: true,
          room: {
            id: room.id,
            name: room.name,
            hasPassword: !!room.password,
            fileCount: room.files.length,
            createdAt: room.createdAt,
            members: Array.from(room.members.entries()).map(([id, info]) => ({
              userId: id,
              userName: info.name,
              lastSeen: info.lastSeen
            })),
            messages: room.messages.slice(-50) // Return last 50 messages
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Failed to join room',
          error: error.message
        });
      }
    });

    // Heartbeat to keep member in list
    router.post('/heartbeat/:roomId', (req, res) => {
      const { roomId } = req.params;
      const { userId, userName } = req.body;
      const room = this.activeRooms.get(roomId);
      
      if (room && userId) {
        room.members.set(userId, {
          name: userName || 'Anonymous',
          lastSeen: new Date()
        });
        room.lastAccess = new Date();
        
        // Clean up inactive members (no heartbeat for 10s)
        const now = new Date();
        for (const [mid, info] of room.members.entries()) {
          if (now - info.lastSeen > 10000) {
            room.members.delete(mid);
          }
        }

        res.json({ 
          success: true,
          members: Array.from(room.members.entries()).map(([id, info]) => ({
            userId: id,
            userName: info.name
          })),
          files: room.files.map(file => ({
            id: file.id,
            name: file.originalName,
            size: file.size,
            type: file.mimetype,
            uploadedAt: file.uploadedAt
          })),
          messages: room.messages.slice(-50)
        });
      } else {
        res.status(404).json({ success: false });
      }
    });

    // Send text message
    router.post('/message/:roomId', (req, res) => {
      const { roomId } = req.params;
      const { userId, userName, text } = req.body;
      const room = this.activeRooms.get(roomId);
      
      if (room && userId && text) {
        const message = {
          id: crypto.randomUUID(),
          userId,
          userName: userName || 'Anonymous',
          text,
          timestamp: new Date()
        };
        room.messages.push(message);
        if (room.messages.length > 100) room.messages.shift(); // Keep only last 100
        
        res.json({ success: true, message });
      } else {
        res.status(400).json({ success: false });
      }
    });

    // Upload files to FTP room
    router.post('/upload/:roomId', this.upload.array('files', 10), (req, res) => {
      try {
        const { roomId } = req.params;
        const { password } = req.body;

        const room = this.activeRooms.get(roomId);
        
        if (!room) {
          return res.status(404).json({
            success: false,
            message: 'Room not found'
          });
        }

        if (room.password && room.password !== password) {
          return res.status(401).json({
            success: false,
            message: 'Invalid password'
          });
        }

        const uploadedFiles = req.files.map(file => ({
          id: crypto.randomUUID(),
          originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype,
          uploadedAt: new Date(),
          path: file.path
        }));

        room.files.push(...uploadedFiles);
        room.lastAccess = new Date();

        res.json({
          success: true,
          files: uploadedFiles,
          message: `${uploadedFiles.length} file(s) uploaded successfully`
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Failed to upload files',
          error: error.message
        });
      }
    });

    // List files in FTP room
    router.post('/files/:roomId', (req, res) => {
      try {
        const { roomId } = req.params;
        const { password } = req.body;

        const room = this.activeRooms.get(roomId);
        
        if (!room) {
          return res.status(404).json({
            success: false,
            message: 'Room not found'
          });
        }

        if (room.password && room.password !== password) {
          return res.status(401).json({
            success: false,
            message: 'Invalid password'
          });
        }

        room.lastAccess = new Date();

        const files = room.files.map(file => ({
          id: file.id,
          name: file.originalName,
          size: file.size,
          type: file.mimetype,
          uploadedAt: file.uploadedAt
        }));

        res.json({
          success: true,
          files,
          room: {
            id: room.id,
            name: room.name,
            fileCount: files.length
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Failed to list files',
          error: error.message
        });
      }
    });

    // Download file from FTP room
    router.post('/download/:roomId/:fileId', (req, res) => {
      try {
        const { roomId, fileId } = req.params;
        const { password } = req.body;

        const room = this.activeRooms.get(roomId);
        
        if (!room) {
          return res.status(404).json({
            success: false,
            message: 'Room not found'
          });
        }

        if (room.password && room.password !== password) {
          return res.status(401).json({
            success: false,
            message: 'Invalid password'
          });
        }

        const file = room.files.find(f => f.id === fileId);
        if (!file) {
          return res.status(404).json({
            success: false,
            message: 'File not found'
          });
        }

        if (!fs.existsSync(file.path)) {
          return res.status(404).json({
            success: false,
            message: 'File no longer exists'
          });
        }

        room.lastAccess = new Date();

        res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
        res.setHeader('Content-Type', file.mimetype);
        
        const fileStream = fs.createReadStream(file.path);
        fileStream.pipe(res);
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Failed to download file',
          error: error.message
        });
      }
    });

    // Delete file from FTP room
    router.post('/delete/:roomId/:fileId', (req, res) => {
      try {
        const { roomId, fileId } = req.params;
        const { password } = req.body;

        const room = this.activeRooms.get(roomId);
        
        if (!room) {
          return res.status(404).json({
            success: false,
            message: 'Room not found'
          });
        }

        if (room.password && room.password !== password) {
          return res.status(401).json({
            success: false,
            message: 'Invalid password'
          });
        }

        const fileIndex = room.files.findIndex(f => f.id === fileId);
        if (fileIndex === -1) {
          return res.status(404).json({
            success: false,
            message: 'File not found'
          });
        }

        const file = room.files[fileIndex];
        
        // Delete physical file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

        // Remove from room
        room.files.splice(fileIndex, 1);
        room.lastAccess = new Date();

        res.json({
          success: true,
          message: 'File deleted successfully'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Failed to delete file',
          error: error.message
        });
      }
    });

    // Get FTP server status and room list
    router.get('/status', (req, res) => {
      try {
        const rooms = Array.from(this.activeRooms.values()).map(room => ({
          id: room.id,
          name: room.name,
          hasPassword: !!room.password,
          fileCount: room.files.length,
          memberCount: room.members.size,
          createdAt: room.createdAt,
          lastAccess: room.lastAccess
        }));

        res.json({
          success: true,
          serverStatus: 'active',
          roomCount: rooms.length,
          totalFiles: rooms.reduce((sum, room) => sum + room.fileCount, 0),
          rooms
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Failed to get server status',
          error: error.message
        });
      }
    });

    app.use('/api/ftp', router);

    // Serve FTP interface (offline-compatible)
    app.get('/ftp', (req, res) => {
      res.send(this.generateFTPInterface());
    });

    // Serve FTP room interface
    app.get('/ftp/:roomId', (req, res) => {
      res.send(this.generateFTPInterface(req.params.roomId));
    });

    // Cleanup old rooms every hour
    setInterval(() => {
      this.cleanupOldRooms();
    }, 60 * 60 * 1000);
  }

  generateRoomId() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
  }

  // Generate offline-compatible HTML interface
  generateFTPInterface(roomId = null) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FileShare Remote Server</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, sans-serif; background: #0f172a; color: white; min-height: 100vh; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .header { text-align: center; margin-bottom: 2rem; }
        .card { background: #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid #334155; }
        .btn { padding: 0.75rem 1.5rem; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-secondary { background: #475569; color: white; }
        .form-group { margin-bottom: 1rem; }
        input { width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
        .members-list { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
        .member-badge { background: #334155; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; }
        .chat-box { height: 300px; overflow-y: auto; background: #0f172a; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .chat-msg { background: #334155; padding: 0.5rem 1rem; border-radius: 8px; align-self: flex-start; max-width: 80%; }
        .chat-msg.mine { align-self: flex-end; background: #3b82f6; }
        .chat-msg small { display: block; font-size: 0.7rem; opacity: 0.7; margin-bottom: 0.25rem; }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>🌐 FileShare Remote</h1><p>Sharing over the Internet</p></div>
        \${roomId ? this.generateRoomInterface(roomId) : this.generateMainInterface()}
    </div>
    <script>\${this.generateJavaScript(roomId)}</script>
</body>
</html>`;
  }

  generateMainInterface() {
    return `
        <div class="card">
            <h2>Create New Room</h2>
            <form id="createRoomForm"><div class="form-group"><input type="text" id="roomName" placeholder="Room Name (Optional)"></div><div class="form-group"><input type="password" id="roomPassword" placeholder="Password (Optional)"></div><button type="submit" class="btn btn-primary">Create Room</button></form>
        </div>
        <div class="card">
            <h2>Join Room</h2>
            <form id="joinRoomForm"><div class="form-group"><input type="text" id="joinRoomId" placeholder="Room ID" maxlength="6"></div><div class="form-group"><input type="password" id="joinPassword" placeholder="Password"></div><button type="submit" class="btn btn-primary">Join Room</button></form>
        </div>`;
  }

  generateRoomInterface(roomId) {
    return `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2>Room: ${roomId}</h2>
                <div id="membersCount" class="member-badge">0 members</div>
            </div>
            <div id="membersList" class="members-list"></div>
            
            <div class="grid">
                <div>
                    <h3>Upload Files</h3>
                    <div id="uploadArea" style="border: 2px dashed #334155; padding: 2rem; text-align: center; border-radius: 12px; cursor: pointer; margin-top: 1rem;">📁 Drop or Click</div>
                    <input type="file" id="fileInput" multiple class="hidden">
                    <div id="filesList" style="margin-top: 1rem;"></div>
                </div>
                <div>
                    <h3>Chat / Text Share</h3>
                    <div id="chatBox" class="chat-box"></div>
                    <div style="display:flex; gap:0.5rem;">
                        <input type="text" id="chatInput" placeholder="Type a message...">
                        <button id="sendBtn" class="btn btn-primary">Send</button>
                    </div>
                </div>
            </div>
        </div>`;
  }

  generateJavaScript(roomId) {
    return `
        const API_BASE = window.location.origin;
        let currentRoomId = '${roomId || ''}';
        let currentPassword = '';
        let myId = Math.random().toString(36).substring(7);
        let myName = prompt('Enter your name:') || 'User_' + myId.substring(0, 3);

        ${roomId ? this.generateRoomJavaScript() : this.generateMainJavaScript()}
    `;
  }

  generateMainJavaScript() {
    return `
        document.getElementById('createRoomForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const res = await fetch(\`\${API_BASE}/api/ftp/create-room\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomName: document.getElementById('roomName').value, password: document.getElementById('roomPassword').value })
            });
            const data = await res.json();
            if(data.success) window.location.href = \`\${API_BASE}/ftp/\${data.roomId}\`;
        });
        document.getElementById('joinRoomForm').addEventListener('submit', (e) => {
            e.preventDefault();
            window.location.href = \`\${API_BASE}/ftp/\${document.getElementById('joinRoomId').value.toUpperCase()}\`;
        });`;
  }

  generateRoomJavaScript() {
    return `
        async function refresh() {
            try {
                const res = await fetch(\`\${API_BASE}/api/ftp/heartbeat/\${currentRoomId}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: myId, userName: myName })
                });
                const data = await res.json();
                if(data.success) {
                    updateMembers(data.members);
                    updateFiles(data.files);
                    updateChat(data.messages);
                }
            } catch(e) {}
        }

        function updateMembers(members) {
            const list = document.getElementById('membersList');
            document.getElementById('membersCount').innerText = \`\${members.length} member(s)\`;
            list.innerHTML = members.map(m => \`<span class="member-badge">\${m.userName}\${m.userId === myId ? ' (You)' : ''}</span>\`).join('');
        }

        function updateFiles(files) {
            const list = document.getElementById('filesList');
            if(files.length === 0) { list.innerHTML = '<p>No files yet.</p>'; return; }
            list.innerHTML = files.map(f => \`
                <div class="card" style="padding: 1rem; margin-top: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                    <span>\${f.name} (\${(f.size/1024/1024).toFixed(2)} MB)</span>
                    <button class="btn btn-primary" onclick="download('\${f.id}', '\${f.name}')">Download</button>
                </div>\`).join('');
        }

        function updateChat(messages) {
            const box = document.getElementById('chatBox');
            const atBottom = box.scrollHeight - box.scrollTop <= box.clientHeight + 50;
            box.innerHTML = messages.map(m => \`
                <div class="chat-msg \${m.userId === myId ? 'mine' : ''}">
                    <small>\${m.userName}</small>
                    <div>\${m.text}</div>
                </div>\`).join('');
            if(atBottom) box.scrollTop = box.scrollHeight;
        }

        async function sendMsg() {
            const input = document.getElementById('chatInput');
            if(!input.value.trim()) return;
            await fetch(\`\${API_BASE}/api/ftp/message/\${currentRoomId}\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: myId, userName: myName, text: input.value })
            });
            input.value = '';
            refresh();
        }

        document.getElementById('sendBtn').onclick = sendMsg;
        document.getElementById('chatInput').onkeypress = (e) => { if(e.key === 'Enter') sendMsg(); };

        const upArea = document.getElementById('uploadArea');
        const fInput = document.getElementById('fileInput');
        upArea.onclick = () => fInput.click();
        fInput.onchange = async () => {
            const formData = new FormData();
            for(let f of fInput.files) formData.append('files', f);
            await fetch(\`\${API_BASE}/api/ftp/upload/\${currentRoomId}\`, { method: 'POST', body: formData });
            fInput.value = '';
            refresh();
        };

        async function download(fid, name) {
            const res = await fetch(\`\${API_BASE}/api/ftp/download/\${currentRoomId}/\${fid}\`, { method: 'POST' });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = name; a.click();
        }

        setInterval(refresh, 1000);
        refresh();`;
  }

  cleanupOldRooms() {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [roomId, room] of this.activeRooms.entries()) {
      if (now - room.lastAccess > maxAge) {
        const roomDir = path.join(this.uploadDir, roomId);
        if (fs.existsSync(roomDir)) {
          fs.rmSync(roomDir, { recursive: true, force: true });
        }
        this.activeRooms.delete(roomId);
        console.log(`🧹 Cleaned up old room: ${roomId}`);
      }
    }
  }

  stop() { console.log('📁 FTP Server handlers stopped'); }
}

module.exports = FTPServer;

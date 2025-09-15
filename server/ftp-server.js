const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cors = require('cors');

class FTPServer {
  constructor() {
    this.app = express();
    this.activeRooms = new Map(); // roomId -> { password, files, createdAt, lastAccess }
    this.uploadDir = path.join(__dirname, 'uploads');
    this.setupServer();
  }

  setupServer() {
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    // Enable CORS for local network access
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) return callback(null, true);
        
        // Allow localhost
        if (origin.includes('localhost')) return callback(null, true);
        
        // Allow local network ranges
        if (origin.match(/^https?:\/\/192\.168\.\d+\.\d+/)) return callback(null, true);
        if (origin.match(/^https?:\/\/10\.\d+\.\d+\.\d+/)) return callback(null, true);
        if (origin.match(/^https?:\/\/172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+/)) return callback(null, true);
        
        // Deny all other origins
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true
    }));

    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));

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
        // Preserve original filename with timestamp to avoid conflicts
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

    this.setupRoutes();
  }

  setupRoutes() {
    // Create a new FTP room
    this.app.post('/api/ftp/create-room', (req, res) => {
      try {
        const { password, roomName } = req.body;
        const roomId = this.generateRoomId();
        
        const room = {
          id: roomId,
          name: roomName || `FTP Room ${roomId}`,
          password: password || '',
          files: [],
          createdAt: new Date(),
          lastAccess: new Date(),
          type: 'ftp'
        };

        this.activeRooms.set(roomId, room);

        res.json({
          success: true,
          roomId,
          roomName: room.name,
          message: 'FTP room created successfully'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Failed to create FTP room',
          error: error.message
        });
      }
    });

    // Join/Access FTP room
    this.app.post('/api/ftp/join/:roomId', (req, res) => {
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

        // Update last access
        room.lastAccess = new Date();

        res.json({
          success: true,
          room: {
            id: room.id,
            name: room.name,
            hasPassword: !!room.password,
            fileCount: room.files.length,
            createdAt: room.createdAt
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

    // Upload files to FTP room
    this.app.post('/api/ftp/upload/:roomId', this.upload.array('files', 10), (req, res) => {
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
    this.app.post('/api/ftp/files/:roomId', (req, res) => {
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
    this.app.post('/api/ftp/download/:roomId/:fileId', (req, res) => {
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
    this.app.post('/api/ftp/delete/:roomId/:fileId', (req, res) => {
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
    this.app.get('/api/ftp/status', (req, res) => {
      try {
        const rooms = Array.from(this.activeRooms.values()).map(room => ({
          id: room.id,
          name: room.name,
          hasPassword: !!room.password,
          fileCount: room.files.length,
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

    // Serve FTP interface (offline-compatible)
    this.app.get('/ftp', (req, res) => {
      res.send(this.generateFTPInterface());
    });

    // Serve FTP room interface
    this.app.get('/ftp/:roomId', (req, res) => {
      res.send(this.generateFTPInterface(req.params.roomId));
    });
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
    <title>FileShare FTP Server</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }

        .header {
            text-align: center;
            margin-bottom: 3rem;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }

        .card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 2rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
            margin-bottom: 2rem;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }

        .form-group input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            font-size: 1rem;
        }

        .form-group input::placeholder {
            color: rgba(255, 255, 255, 0.6);
        }

        .form-group input:focus {
            outline: none;
            border-color: #22c55e;
            box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
        }

        .btn {
            background: #22c55e;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
            margin-right: 1rem;
            margin-bottom: 1rem;
        }

        .btn:hover {
            background: #16a34a;
            transform: translateY(-2px);
        }

        .btn-secondary {
            background: rgba(255, 255, 255, 0.2);
        }

        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .btn-danger {
            background: #dc2626;
        }

        .btn-danger:hover {
            background: #b91c1c;
        }

        .file-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1rem;
            margin-top: 2rem;
        }

        .file-card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 1.5rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .file-info h3 {
            margin-bottom: 0.5rem;
            word-break: break-word;
        }

        .file-meta {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
            margin-bottom: 1rem;
        }

        .file-actions {
            display: flex;
            gap: 0.5rem;
        }

        .upload-area {
            border: 2px dashed rgba(255, 255, 255, 0.3);
            border-radius: 12px;
            padding: 3rem;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
        }

        .upload-area:hover {
            border-color: #22c55e;
            background: rgba(34, 197, 94, 0.1);
        }

        .upload-area.drag-over {
            border-color: #22c55e;
            background: rgba(34, 197, 94, 0.2);
        }

        .status {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
        }

        .status.success {
            background: rgba(34, 197, 94, 0.2);
            border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .status.error {
            background: rgba(220, 38, 38, 0.2);
            border: 1px solid rgba(220, 38, 38, 0.3);
        }

        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .hidden {
            display: none;
        }

        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .file-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📁 FileShare FTP Server</h1>
            <p>Offline File Transfer System - No Internet Required</p>
        </div>

        ${roomId ? this.generateRoomInterface(roomId) : this.generateMainInterface()}
    </div>

    <script>
        ${this.generateJavaScript(roomId)}
    </script>
</body>
</html>`;
  }

  generateMainInterface() {
    return `
        <div class="card">
            <h2>Create New FTP Room</h2>
            <form id="createRoomForm">
                <div class="form-group">
                    <label for="roomName">Room Name (Optional)</label>
                    <input type="text" id="roomName" placeholder="Enter room name">
                </div>
                <div class="form-group">
                    <label for="roomPassword">Password (Optional)</label>
                    <input type="password" id="roomPassword" placeholder="Enter password for protection">
                </div>
                <button type="submit" class="btn">Create FTP Room</button>
            </form>
        </div>

        <div class="card">
            <h2>Join Existing FTP Room</h2>
            <form id="joinRoomForm">
                <div class="form-group">
                    <label for="joinRoomId">Room ID</label>
                    <input type="text" id="joinRoomId" placeholder="Enter 6-character room ID" maxlength="6" style="text-transform: uppercase; font-family: monospace;">
                </div>
                <div class="form-group">
                    <label for="joinPassword">Password</label>
                    <input type="password" id="joinPassword" placeholder="Enter room password (if required)">
                </div>
                <button type="submit" class="btn">Join FTP Room</button>
            </form>
        </div>

        <div id="statusMessage"></div>
    `;
  }

  generateRoomInterface(roomId) {
    return `
        <div class="card">
            <h2>FTP Room: ${roomId}</h2>
            <div id="roomInfo"></div>
            
            <div class="upload-area" id="uploadArea">
                <p>📁 Drop files here or click to select</p>
                <input type="file" id="fileInput" multiple class="hidden">
            </div>
            
            <div id="uploadStatus"></div>
        </div>

        <div class="card">
            <h2>Files in Room</h2>
            <button class="btn btn-secondary" onclick="refreshFiles()">🔄 Refresh</button>
            <div id="filesList"></div>
        </div>

        <div id="statusMessage"></div>
    `;
  }

  generateJavaScript(roomId) {
    return `
        const API_BASE = window.location.origin;
        let currentRoomId = '${roomId || ''}';
        let currentPassword = '';

        function showStatus(message, type = 'success') {
            const statusDiv = document.getElementById('statusMessage');
            statusDiv.innerHTML = \`<div class="status \${type}">\${message}</div>\`;
            setTimeout(() => statusDiv.innerHTML = '', 5000);
        }

        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        ${roomId ? this.generateRoomJavaScript() : this.generateMainJavaScript()}
    `;
  }

  generateMainJavaScript() {
    return `
        document.getElementById('createRoomForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const roomName = document.getElementById('roomName').value;
            const password = document.getElementById('roomPassword').value;
            
            try {
                const response = await fetch(\`\${API_BASE}/api/ftp/create-room\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomName, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showStatus(\`Room created successfully! Room ID: \${data.roomId}\`);
                    setTimeout(() => {
                        window.location.href = \`\${API_BASE}/ftp/\${data.roomId}\`;
                    }, 2000);
                } else {
                    showStatus(data.message, 'error');
                }
            } catch (error) {
                showStatus('Failed to create room: ' + error.message, 'error');
            }
        });

        document.getElementById('joinRoomForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const roomId = document.getElementById('joinRoomId').value.toUpperCase();
            const password = document.getElementById('joinPassword').value;
            
            if (roomId.length !== 6) {
                showStatus('Room ID must be 6 characters', 'error');
                return;
            }
            
            try {
                const response = await fetch(\`\${API_BASE}/api/ftp/join/\${roomId}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showStatus('Joining room...');
                    window.location.href = \`\${API_BASE}/ftp/\${roomId}\`;
                } else {
                    showStatus(data.message, 'error');
                }
            } catch (error) {
                showStatus('Failed to join room: ' + error.message, 'error');
            }
        });

        // Auto-format room ID input
        document.getElementById('joinRoomId').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    `;
  }

  generateRoomJavaScript() {
    return `
        // Get password from user when page loads
        if (currentRoomId) {
            const password = prompt('Enter room password (leave blank if no password):') || '';
            currentPassword = password;
            loadRoomInfo();
            loadFiles();
        }

        async function loadRoomInfo() {
            try {
                const response = await fetch(\`\${API_BASE}/api/ftp/join/\${currentRoomId}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: currentPassword })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    document.getElementById('roomInfo').innerHTML = \`
                        <p><strong>Room:</strong> \${data.room.name}</p>
                        <p><strong>Files:</strong> \${data.room.fileCount}</p>
                        <p><strong>Created:</strong> \${new Date(data.room.createdAt).toLocaleString()}</p>
                    \`;
                } else {
                    showStatus(data.message, 'error');
                }
            } catch (error) {
                showStatus('Failed to load room info: ' + error.message, 'error');
            }
        }

        async function loadFiles() {
            try {
                const response = await fetch(\`\${API_BASE}/api/ftp/files/\${currentRoomId}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: currentPassword })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const filesDiv = document.getElementById('filesList');
                    
                    if (data.files.length === 0) {
                        filesDiv.innerHTML = '<p>No files uploaded yet.</p>';
                        return;
                    }
                    
                    filesDiv.innerHTML = \`
                        <div class="file-grid">
                            \${data.files.map(file => \`
                                <div class="file-card">
                                    <div class="file-info">
                                        <h3>\${file.name}</h3>
                                        <div class="file-meta">
                                            <p>Size: \${formatFileSize(file.size)}</p>
                                            <p>Type: \${file.type}</p>
                                            <p>Uploaded: \${new Date(file.uploadedAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div class="file-actions">
                                        <button class="btn" onclick="downloadFile('\${file.id}', '\${file.name}')">📥 Download</button>
                                        <button class="btn btn-danger" onclick="deleteFile('\${file.id}', '\${file.name}')">🗑️ Delete</button>
                                    </div>
                                </div>
                            \`).join('')}
                        </div>
                    \`;
                } else {
                    showStatus(data.message, 'error');
                }
            } catch (error) {
                showStatus('Failed to load files: ' + error.message, 'error');
            }
        }

        function refreshFiles() {
            loadFiles();
            showStatus('Files refreshed');
        }

        async function downloadFile(fileId, fileName) {
            try {
                const response = await fetch(\`\${API_BASE}/api/ftp/download/\${currentRoomId}/\${fileId}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: currentPassword })
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    a.click();
                    window.URL.revokeObjectURL(url);
                    showStatus(\`Downloading \${fileName}\`);
                } else {
                    const data = await response.json();
                    showStatus(data.message, 'error');
                }
            } catch (error) {
                showStatus('Failed to download file: ' + error.message, 'error');
            }
        }

        async function deleteFile(fileId, fileName) {
            if (!confirm(\`Are you sure you want to delete "\${fileName}"?\`)) {
                return;
            }
            
            try {
                const response = await fetch(\`\${API_BASE}/api/ftp/delete/\${currentRoomId}/\${fileId}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: currentPassword })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showStatus(\`File "\${fileName}" deleted successfully\`);
                    loadFiles();
                } else {
                    showStatus(data.message, 'error');
                }
            } catch (error) {
                showStatus('Failed to delete file: ' + error.message, 'error');
            }
        }

        // File upload functionality
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => fileInput.click());

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            handleFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });

        async function handleFiles(files) {
            if (files.length === 0) return;
            
            const statusDiv = document.getElementById('uploadStatus');
            statusDiv.innerHTML = '<div class="status"><div class="loading"></div> Uploading files...</div>';
            
            const formData = new FormData();
            for (let file of files) {
                formData.append('files', file);
            }
            formData.append('password', currentPassword);
            
            try {
                const response = await fetch(\`\${API_BASE}/api/ftp/upload/\${currentRoomId}\`, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    statusDiv.innerHTML = \`<div class="status success">\${data.message}</div>\`;
                    loadFiles();
                    loadRoomInfo();
                    fileInput.value = '';
                } else {
                    statusDiv.innerHTML = \`<div class="status error">\${data.message}</div>\`;
                }
            } catch (error) {
                statusDiv.innerHTML = \`<div class="status error">Upload failed: \${error.message}</div>\`;
            }
            
            setTimeout(() => statusDiv.innerHTML = '', 5000);
        }
    `;
  }

  start(port = 3003) {
    this.server = this.app.listen(port, '0.0.0.0', () => {
      console.log(`📁 FTP Server running on http://0.0.0.0:${port}`);
      console.log(`📁 FTP Interface available at:`);
      console.log(`  - Local: http://localhost:${port}/ftp`);
      console.log(`  - Network: http://192.168.200.1:${port}/ftp`);
      console.log(`📁 FTP Server ready for offline file sharing`);
    });

    // Cleanup old rooms every hour
    setInterval(() => {
      this.cleanupOldRooms();
    }, 60 * 60 * 1000);

    return this.server;
  }

  cleanupOldRooms() {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [roomId, room] of this.activeRooms.entries()) {
      if (now - room.lastAccess > maxAge) {
        // Delete room files
        const roomDir = path.join(this.uploadDir, roomId);
        if (fs.existsSync(roomDir)) {
          fs.rmSync(roomDir, { recursive: true, force: true });
        }
        
        this.activeRooms.delete(roomId);
        console.log(`🧹 Cleaned up old FTP room: ${roomId}`);
      }
    }
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log('📁 FTP Server stopped');
    }
  }
}

module.exports = FTPServer;

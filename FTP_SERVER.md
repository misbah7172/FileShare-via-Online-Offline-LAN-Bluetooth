# FileShare FTP Server Mode

## Overview

The FTP Server Mode is a new feature that provides offline file transfer capabilities without requiring internet connectivity. This mode creates a local file server that can be accessed by any device on the same network using just a room ID and password.

## Features

### 🌐 **Offline Operation**
- **No Internet Required**: Works completely offline on local networks
- **Self-Contained**: All CSS and JavaScript embedded for offline compatibility
- **Network Independent**: Only requires local network connectivity

### 🔒 **Security**
- **Room-Based Access**: Each FTP room has a unique 6-character ID
- **Password Protection**: Optional password protection for rooms
- **Isolated Storage**: Files are stored per-room with complete isolation

### 📁 **File Management**
- **Multi-File Upload**: Support for multiple files up to 100MB each
- **Drag & Drop**: Intuitive drag-and-drop file upload interface
- **File Operations**: Download, delete, and manage files within rooms
- **File Metadata**: View file size, type, and upload timestamp

### 🎯 **Easy Access**
- **Direct URLs**: Access rooms directly via `http://server:3003/ftp/ROOMID`
- **Web Interface**: Clean, responsive web interface that works on any device
- **No App Required**: Works in any web browser without additional software

## How to Use

### 1. **Start the Server**
```bash
cd server
npm start
```
The FTP server will be available at:
- **Main Interface**: http://localhost:3003/ftp
- **Direct Room Access**: http://localhost:3003/ftp/ROOMID

### 2. **Create a Room**
1. Open http://localhost:3003/ftp in your browser
2. Fill in the "Create New FTP Room" form:
   - **Room Name**: Optional descriptive name
   - **Password**: Optional password for protection
3. Click "Create FTP Room"
4. Note the generated 6-character Room ID

### 3. **Join a Room**
1. Open http://localhost:3003/ftp in your browser
2. Fill in the "Join Existing FTP Room" form:
   - **Room ID**: Enter the 6-character room ID
   - **Password**: Enter password if room is protected
3. Click "Join FTP Room"

### 4. **Share Files**
1. **Upload Files**: 
   - Drag files onto the upload area, or
   - Click the upload area to select files
2. **Download Files**: Click the download button on any file
3. **Delete Files**: Click the delete button to remove files

## API Endpoints

### Room Management
- `POST /api/ftp/create-room` - Create a new FTP room
- `POST /api/ftp/join/:roomId` - Join/access an existing room
- `GET /api/ftp/status` - Get server status and room list

### File Operations
- `POST /api/ftp/upload/:roomId` - Upload files to a room
- `POST /api/ftp/files/:roomId` - List files in a room
- `POST /api/ftp/download/:roomId/:fileId` - Download a specific file
- `POST /api/ftp/delete/:roomId/:fileId` - Delete a specific file

### Web Interface
- `GET /ftp` - Main FTP interface
- `GET /ftp/:roomId` - Direct room access interface

## Network Configuration

### Default Ports
- **Main Server**: Port 3001 (WebRTC P2P)
- **LAN Discovery**: Port 3002 (UDP)
- **FTP Server**: Port 3003 (HTTP)

### CORS Settings
The FTP server automatically allows access from:
- `http://localhost:3000`
- `http://192.168.*:3000` 
- `http://10.*:3000`
- `http://172.*:3000`

## File Storage

### Storage Location
Files are stored in: `server/uploads/ROOMID/`

### File Naming
- Original filename preserved with timestamp prefix
- Format: `timestamp-originalname.ext`
- Supports Unicode filenames

### Cleanup
- Rooms inactive for 24+ hours are automatically cleaned up
- Physical files are deleted when rooms are cleaned up
- Manual file deletion removes files immediately

## Integration with Main App

### Mode Switching
Access FTP mode through the main FileShare application:
1. Open http://localhost:3000
2. Click the "FTP Server" toggle in the header
3. Use the integrated FTP interface

### Complementary Features
- **Internet Mode**: Global P2P file sharing
- **LAN Mode**: Local network P2P with device discovery  
- **FTP Mode**: Local file server with room-based access

## Browser Compatibility

### Supported Browsers
- ✅ Chrome/Chromium (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers

### Required Features
- HTML5 File API
- FormData support
- CSS3 support
- JavaScript ES6+

## Use Cases

### 📱 **Cross-Platform Sharing**
- Share files between Windows, Mac, Linux, iOS, Android
- No platform-specific apps required
- Works with any device that has a web browser

### 🏢 **Office/Team Collaboration**
- Create temporary file drops for team projects
- Share large files without email limitations
- Password-protect sensitive documents

### 🎓 **Educational Environments**
- Teachers share materials with students
- Students submit assignments to shared folders
- Workshop file distribution

### 🏠 **Home Network File Sharing**
- Share photos/videos between family devices
- Transfer files to smart TVs, tablets, phones
- Backup files to multiple devices

### 🛠 **Technical/Development Use**
- Quick file transfers during development
- Share build artifacts between machines
- Temporary file hosting for testing

## Security Considerations

### ⚠️ **Network Security**
- FTP server is accessible to all devices on the local network
- Use strong passwords for sensitive rooms
- Consider firewall rules for additional security

### 🔒 **Data Protection**
- Files are not encrypted at rest
- Use HTTPS in production environments
- Regular cleanup prevents data accumulation

### 👥 **Access Control**
- Room IDs are randomly generated (6 characters = 16.8M combinations)
- Password protection adds additional security layer
- No user authentication system (by design for simplicity)

## Troubleshooting

### Common Issues

**Can't access FTP interface:**
- Check if server is running on port 3003
- Verify firewall settings allow port 3003
- Try accessing via IP address instead of localhost

**Files won't upload:**
- Check file size limits (100MB per file)
- Verify browser supports File API
- Check network connectivity

**Room not found:**
- Verify room ID is exactly 6 characters
- Check if room has expired (24+ hour cleanup)
- Try creating a new room

### Debug Information
Check server logs for detailed error messages and connection information.

## Future Enhancements

### Planned Features
- [ ] File compression for large uploads
- [ ] Batch file operations
- [ ] File preview capabilities
- [ ] Custom room expiration times
- [ ] User authentication system
- [ ] File encryption at rest
- [ ] Mobile app integration
- [ ] File versioning support

---

**Note**: The FTP Server Mode provides a simple, effective solution for offline file sharing. While called "FTP" for familiarity, it actually uses HTTP/HTTPS for maximum compatibility and ease of use.

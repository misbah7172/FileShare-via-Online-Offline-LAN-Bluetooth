# FileShare FTP Server - Network Access Setup Guide

## 🚀 Quick Start for Network Access

### **Step 1: Start the Server**
```bash
cd server
npm start
```

The server will show network access URLs:
```
📁 FTP Interface available at:
  - Local: http://localhost:3003/ftp
  - Network: http://192.168.200.1:3003/ftp
```

### **Step 2: Share the Network URL**
Share the **Network URL** with other devices on the same WiFi network:
- **Direct FTP Access**: `http://192.168.200.1:3003/ftp`
- **Main App + FTP Mode**: `http://192.168.200.1:3000` (then toggle FTP mode)

### **Step 3: Verify Network Access**
1. Open `http://192.168.200.1:3003/network-access.html` for troubleshooting guide
2. Test FTP functionality from another device
3. Create/join rooms and upload files

## 🔧 Network Configuration Fixed

### **CORS Configuration**
✅ **Fixed CORS issues** - The server now accepts connections from:
- `localhost` and `127.0.0.1`
- Private network ranges: `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`
- Any port (3000, 3003, etc.)

### **Dynamic API Detection**
✅ **Smart URL detection** - The FTP mode automatically detects:
- If accessed via `localhost` → uses `http://localhost:3003`
- If accessed via network IP → uses `http://[network-ip]:3003`

### **Server Binding**
✅ **Network binding** - All servers bind to `0.0.0.0`:
- Main server: `0.0.0.0:3001`
- LAN Discovery: `0.0.0.0:3002` 
- FTP Server: `0.0.0.0:3003`

## 📱 Device Access Methods

### **Method 1: Direct FTP Interface**
```
http://192.168.200.1:3003/ftp
```
- Standalone web interface
- Works on any browser
- No app installation needed
- Complete offline functionality

### **Method 2: Main App with FTP Mode**
```
http://192.168.200.1:3000
```
1. Open the main FileShare app
2. Click "FTP Server" toggle in header
3. Use integrated FTP interface

### **Method 3: Direct Room Access**
```
http://192.168.200.1:3003/ftp/ROOMID
```
- Direct access to specific rooms
- Just need room ID and password
- Perfect for sharing with others

## 🛠 Troubleshooting Network Issues

### **Problem: "Can't access from other devices"**

**Solution 1: Check Network Connection**
```bash
# On the server machine, find your IP:
ipconfig          # Windows
ifconfig          # Mac/Linux
```

**Solution 2: Windows Firewall**
```powershell
# Allow port 3003 through Windows Firewall
netsh advfirewall firewall add rule name="FileShare FTP" dir=in action=allow protocol=TCP localport=3003
```

**Solution 3: Test Connectivity**
```bash
# From another device, test if port is reachable:
telnet 192.168.200.1 3003
# or in browser:
http://192.168.200.1:3003/ftp
```

### **Problem: "CORS errors in browser console"**

**Solution: Updated CORS Configuration**
The server now automatically allows:
- ✅ All localhost connections
- ✅ All private network ranges
- ✅ Any port number

### **Problem: "Can't create/join rooms"**

**Solution 1: Check Server Status**
- Verify server shows: `📁 FTP Server running on http://0.0.0.0:3003`
- Check for error messages in server logs

**Solution 2: Clear Browser Cache**
```
Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
```

**Solution 3: Check API Calls**
- Open browser Developer Tools (F12)
- Check Network tab for failed API calls
- Look for 404 or CORS errors

## 🌐 Network Architecture

```
Device 1 (Server Host)     Device 2 (Client)         Device 3 (Mobile)
192.168.200.1             192.168.200.45            192.168.200.23
├── Port 3001 (Main)      │                         │
├── Port 3002 (LAN)       │                         │
└── Port 3003 (FTP) ←─────┼─────────────────────────┼──── Access FTP
                          │                         │
                          ↓                         ↓
                    Browser Access:           Browser Access:
                192.168.200.1:3003/ftp   192.168.200.1:3003/ftp
```

## 📊 Verification Checklist

### **Server Side**
- [ ] Server starts without errors
- [ ] Shows network IP in startup messages
- [ ] Ports 3001, 3002, 3003 are accessible
- [ ] Firewall allows the ports

### **Client Side**
- [ ] Can access `http://[server-ip]:3003/ftp`
- [ ] Can create FTP rooms
- [ ] Can join existing rooms
- [ ] Can upload/download files
- [ ] No CORS errors in console

### **Network Side**
- [ ] All devices on same WiFi/network
- [ ] Can ping server IP from client devices
- [ ] No corporate firewall blocking ports
- [ ] Router allows local connections

## 🎯 Use Case Examples

### **Home Network**
```
Router: 192.168.1.1
Server: 192.168.1.100:3003/ftp
Mobile: 192.168.1.45 → Access FTP via browser
Laptop: 192.168.1.67 → Access FTP via browser
```

### **Office Network**
```
Router: 10.0.0.1
Server: 10.0.0.50:3003/ftp
Team Members: 10.0.0.x → Share room ID for file drops
```

### **Workshop/Classroom**
```
WiFi: ClassroomNet
Teacher: 192.168.100.1:3003/ftp
Students: Any device → Join room via ID
```

## 🔐 Security Notes

### **Network Security**
- FTP server only accepts local network connections
- Room passwords provide additional protection
- Files are isolated per room
- Automatic cleanup after 24 hours

### **Firewall Configuration**
- Only allow port 3003 on local network
- Block external access to prevent unauthorized use
- Consider VPN for remote access if needed

## 🚀 Advanced Configuration

### **Custom IP/Port**
```bash
# Set custom FTP server URL
export REACT_APP_FTP_SERVER_URL=http://192.168.1.100:3003
npm start
```

### **Production Deployment**
```bash
# Build for production
npm run build

# Serve with HTTPS for enhanced security
# (requires SSL certificate setup)
```

---

**✅ Network access is now fully configured and working!**

Other devices on the same network can now:
1. Access the FTP interface directly via IP
2. Create and join FTP rooms
3. Upload and download files
4. Use the offline functionality without internet

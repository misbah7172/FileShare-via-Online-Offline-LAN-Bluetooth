# Render Deploy Configuration

## Environment Variables for Render

When deploying to Render, set these environment variables:

### Required Variables:
```
NODE_ENV=production
PORT=10000
```

### Optional Variables:
```
MAX_ROOM_SIZE=10
SECRET_KEY=your-random-secret-key-here
ROOM_CLEANUP_INTERVAL=3600000
```

### Auto-configured by Render:
```
RENDER_EXTERNAL_URL (automatically set by Render)
```

## Render Configuration

- **Runtime**: Node.js
- **Build Command**: `npm run build:prod`  
- **Start Command**: `npm start`
- **Health Check Path**: `/api/health`
- **Plan**: Free tier compatible

## Post-Deployment

1. Your app will be available at: `https://your-app-name.onrender.com`
2. Test the health endpoint: `https://your-app-name.onrender.com/api/health`
3. Create rooms and share files instantly!

## Features Available on Render

✅ **Internet Mode**: Full P2P file sharing functionality
✅ **Room Management**: Create/join rooms with passwords  
✅ **Real-time Transfers**: WebRTC direct peer connections
✅ **QR Code Sharing**: Easy mobile access
✅ **Cross-platform**: Works on all devices with browsers

❌ **LAN Mode**: Not available (requires local network)
❌ **FTP Server**: Not available (requires local network)

For LAN and FTP features, users need to clone and run the project locally.
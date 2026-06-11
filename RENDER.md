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

✅ **WiFi Mode (P2P)**: Full P2P file sharing functionality
✅ **Internet Mode (Remote)**: Reliable sharing via server upload (NEW!)
✅ **Room Management**: Create/join rooms with passwords  
✅ **Real-time Transfers**: WebRTC direct peer connections
✅ **QR Code Sharing**: Easy mobile access
✅ **Cross-platform**: Works on all devices with browsers

❌ **LAN Mode**: Not available when hosted on Render (requires local network)

For LAN features, users need to clone and run the project locally.

## Internet Mode (Remote) - Server Relay
The new Internet Mode (Remote) allows you to share files even if WebRTC P2P fails. Files are uploaded to the Render server and can be downloaded by anyone in the same room. Note that the free tier of Render has storage limits and files are deleted when the server restarts.
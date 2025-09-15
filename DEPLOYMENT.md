# FileShare - Real-Time P2P File Transfer Platform

A secure, browser-based peer-to-peer file sharing platform that enables real-time file transfers without user accounts or installations.

## 🌟 Features

- ** Online Mode**: Real-time P2P file sharing via hosted server
- ** LAN Mode**: Offline local network file sharing
- ** FTP Server Mode**: Network file server with web interface
- ** End-to-End Encryption**: All transfers are encrypted between peers
- ** Cross-Platform**: Desktop and mobile support
- ** Room-Based Sharing**: Create rooms with unique links and passwords
- ** Real-Time Progress**: Live file transfer progress tracking
- ** QR Code Sharing**: Easy mobile device connection

##  Deployment Options

### Option 1: Online Hosting (Render) - For Internet File Sharing

Deploy to Render for a publicly accessible file sharing service:

#### Prerequisites
- GitHub account
- Render account (free tier available)

#### Deployment Steps

1. **Fork this repository** to your GitHub account

2. **Connect to Render**:
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New" → "Web Service"
   - Connect your GitHub account and select your forked repository

3. **Configure Render Settings**:
   ```
   Name: fileshare-p2p (or your preferred name)
   Environment: Node
   Region: Choose closest to your users
   Branch: main
   Build Command: npm run build:prod
   Start Command: npm start
   ```

4. **Set Environment Variables** in Render:
   ```
   NODE_ENV=production
   PORT=10000
   CORS_ORIGIN=https://your-app-name.onrender.com
   RENDER_EXTERNAL_URL=https://your-app-name.onrender.com
   MAX_ROOM_SIZE=10
   SECRET_KEY=your-random-secret-key
   ```

5. **Deploy**: Click "Create Web Service" and wait for deployment

6. **Access Your App**: Visit `https://your-app-name.onrender.com`

#### Features Available Online:
- ✅ Internet Mode (P2P file sharing)
- ❌ LAN Mode (requires local network)
- ❌ FTP Server Mode (requires local network)

### Option 2: Local Setup - For LAN and FTP Functionality

Clone and run locally to access all features including LAN and FTP modes:

#### Prerequisites
- Node.js 18+ and npm
- Git

#### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/misbah7172/FileShare-via-Online-Offline-LAN-.git
   cd FileShare-via-Online-Offline-LAN-
   ```

2. **Install dependencies**:
   ```bash
   npm run install:all
   ```

3. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env file with your local settings
   ```

4. **Start development servers**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001
   - FTP Server: http://your-local-ip:3002

#### Features Available Locally:
- ✅ Internet Mode (P2P file sharing)
- ✅ LAN Mode (offline device discovery)
- ✅ FTP Server Mode (network file server)

##  Usage Guide

### Internet Mode (Online)
1. Visit the hosted application
2. Create or join a room with Room ID
3. Optionally set a password for security
4. Share the room link or QR code
5. Upload and share files directly between browsers

### LAN Mode (Local Network)
1. Run the application locally
2. Select "LAN Mode"
3. Discover devices on the same network
4. Connect and share files without internet

### FTP Server Mode (Local Network)
1. Run the application locally
2. Select "FTP Server Mode"
3. Create a room with password
4. Other devices can access via web browser using your local IP
5. Upload/download files through the web interface

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment (development/production) | development | No |
| `PORT` | Server port | 3001 | No |
| `CORS_ORIGIN` | Allowed origins for CORS | http://localhost:3000 | No |
| `MAX_ROOM_SIZE` | Maximum users per room | 10 | No |
| `SECRET_KEY` | Encryption secret | - | Yes (production) |

### Production Settings

For Render deployment, use these settings:
```env
NODE_ENV=production
PORT=10000
CORS_ORIGIN=https://your-app.onrender.com
RENDER_EXTERNAL_URL=https://your-app.onrender.com
```

##  Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React Client  │     │  Express Server │     │   React Client  │
│   (Browser)     │────▶│  Socket.io      │◀────│   (Browser)     │
│                 │     │  WebRTC Signal  │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                        │                       │
         └──────── Direct P2P ────┼───────────────────────┘
                                  │
                           ┌──────▼──────┐
                           │ FTP Server  │
                           │ (Optional)  │
                           └─────────────┘
```

##  Development

### Tech Stack
- **Frontend**: React, Socket.io-client, WebRTC
- **Backend**: Node.js, Express, Socket.io
- **File Transfer**: WebRTC Data Channels
- **Network Discovery**: UDP Broadcasting

### Available Scripts

```bash
# Development
npm run dev              # Start both client and server
npm run client:dev       # Start React development server
npm run server:dev       # Start Node.js server with nodemon

# Production
npm run build:prod       # Build for production (used by Render)
npm start               # Start production server
npm run build           # Build React client only

# Utilities
npm run install:all     # Install all dependencies
```

### Project Structure

```
FileShare/
├── client/             # React frontend
│   ├── src/
│   │   ├── components/ # React components
│   │   └── services/   # WebRTC and Socket services
│   └── build/         # Production build
├── server/            # Node.js backend
│   ├── index.js       # Main server file
│   ├── ftp-server.js  # FTP functionality
│   └── lan-discovery.js # LAN device discovery
├── render.yaml        # Render deployment config
└── package.json       # Root package configuration
```

##  Live Demo

Try the online version: [Your Render URL]

##  Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

##  Support

- **Online Issues**: Check Render deployment logs
- **Local Issues**: Check Node.js console output
- **Network Issues**: Ensure firewall allows the required ports
- **Browser Issues**: Use Chrome/Edge for best WebRTC support

##  Security

- All P2P transfers use WebRTC encryption (DTLS/SRTP)
- Room passwords are hashed
- No files are stored permanently on servers
- Local network discovery uses secure UDP protocols

---

**Happy Sharing! **
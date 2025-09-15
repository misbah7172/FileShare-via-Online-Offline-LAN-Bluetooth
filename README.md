# FileShare - Real-Time P2P File Transfer Platform

A secure, browser-based peer-to-peer file sharing platform with **online hosting** and **offline LAN** capabilities.

## 🌟 Features

- **🌐 Online Mode**: Host on Render for internet file sharing
- **🏠 LAN Mode**: Offline local network file sharing  
- **📂 FTP Server Mode**: Network file server with web interface
- **🔒 End-to-End Encryption**: WebRTC encrypted transfers
- **📱 Cross-Platform**: Works on desktop and mobile
- **🏢 Room-Based**: Secure rooms with passwords
- **📊 Real-Time**: Live transfer progress tracking

## 🚀 Quick Start

### For Internet File Sharing (Recommended)

**Deploy to Render** for a publicly accessible service:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

1. Fork this repository
2. Connect to Render and deploy
3. Set environment variables (see [DEPLOYMENT.md](DEPLOYMENT.md))
4. Access your hosted file sharing service

### For LAN/FTP Features

**Run locally** to access all features:

```bash
git clone https://github.com/misbah7172/FileShare-via-Online-Offline-LAN-.git
cd FileShare-via-Online-Offline-LAN-
npm run install:all
npm run dev
```

Visit http://localhost:3000 to access all modes.

## 📖 Complete Setup Guide

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for:
- ✅ Detailed Render deployment instructions
- ✅ Local setup for LAN and FTP modes
- ✅ Environment configuration
- ✅ Troubleshooting guide

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │  Signaling      │     │   Frontend      │
│   (Browser)     │────▶│   Server        │◀────│   (Browser)     │
│                 │     │  (WebSocket)    │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                                │
         └──────────────── WebRTC P2P ───────────────────┘
```

##  Tech Stack

- **Frontend**: React, TypeScript, WebRTC, Socket.io-client
- **Backend**: Node.js, Socket.io, Express
- **Deployment**: Docker, Docker Compose, Caddy (HTTPS)
- **Encryption**: Built-in WebRTC DTLS/SRTP

##  Quick Start

### Development

```bash
# Clone and install dependencies
npm install

# Start development servers
npm run dev
```

### Production (Docker)

```bash
# Build and run with Docker Compose
docker-compose up -d
```

##  Environment Variables

```env
# Server Configuration
PORT=3001
NODE_ENV=production
SECRET_KEY=your-secret-key-here

# Domain Configuration (for HTTPS)
DOMAIN=your-domain.com
EMAIL=your-email@domain.com
```

##  Self-Hosting

1. Clone this repository
2. Copy `.env.example` to `.env` and configure your domain
3. Run `docker-compose up -d`
4. Your instance will be available at `https://your-domain.com`

##  Security

- End-to-end encryption via WebRTC DTLS
- Optional room passwords
- No file storage on server
- HTTPS-only in production
- Secure random room ID generation

##  Mobile Support

- Responsive design for mobile devices
- QR code generation for easy room sharing
- Touch-friendly drag-and-drop interface

##  Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

##  License

MIT License - see LICENSE file for details

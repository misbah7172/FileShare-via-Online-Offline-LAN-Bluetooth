# FileShare - Real-Time P2P File Transfer Platform

A secure, browser-based peer-to-peer file sharing platform that enables real-time file transfers without user accounts or installations.

## 🚀 Features

- **Real-Time P2P Transfer**: Direct peer-to-peer file sharing using WebRTC
- **End-to-End Encryption**: All transfers are encrypted between peers
- **No Installation Required**: Works entirely in the browser
- **Cross-Platform**: Desktop and mobile support
- **Room-Based Sharing**: Create rooms with unique links and optional passwords
- **Multiple Transfer Modes**: One-to-one and one-to-many file sharing
- **File Chunking**: Large file support with resume capability
- **QR Code Sharing**: Easy mobile device connection
- **Self-Hostable**: Docker deployment with HTTPS support

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

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, WebRTC, Socket.io-client
- **Backend**: Node.js, Socket.io, Express
- **Deployment**: Docker, Docker Compose, Caddy (HTTPS)
- **Encryption**: Built-in WebRTC DTLS/SRTP

## 🚀 Quick Start

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

## 📝 Environment Variables

```env
# Server Configuration
PORT=3001
NODE_ENV=production
SECRET_KEY=your-secret-key-here

# Domain Configuration (for HTTPS)
DOMAIN=your-domain.com
EMAIL=your-email@domain.com
```

## 🔧 Self-Hosting

1. Clone this repository
2. Copy `.env.example` to `.env` and configure your domain
3. Run `docker-compose up -d`
4. Your instance will be available at `https://your-domain.com`

## 🛡️ Security

- End-to-end encryption via WebRTC DTLS
- Optional room passwords
- No file storage on server
- HTTPS-only in production
- Secure random room ID generation

## 📱 Mobile Support

- Responsive design for mobile devices
- QR code generation for easy room sharing
- Touch-friendly drag-and-drop interface

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

# FileShare Development Guide

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Docker (for production deployment)

### Development Setup

1. **Install dependencies:**
```bash
npm run install:all
```

2. **Start development servers:**
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:3001
- Frontend development server on http://localhost:3000

3. **Access the application:**
Open http://localhost:3000 in your browser

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
PORT=3001
NODE_ENV=development
SECRET_KEY=your-secret-key-here
CORS_ORIGIN=http://localhost:3000
MAX_ROOM_SIZE=10
ROOM_CLEANUP_INTERVAL=3600000
```

### Production Deployment

#### Using Docker Compose

1. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your production settings
```

2. **Build and deploy:**
```bash
docker-compose up -d
```

#### Manual Deployment

1. **Build frontend:**
```bash
cd client && npm run build
```

2. **Start server:**
```bash
cd server && npm start
```

## Architecture Overview

### Frontend (React)
- **Components**: Modular React components for UI
- **Services**: WebRTC, Socket.io, and utility services
- **State Management**: React hooks for local state

### Backend (Node.js)
- **Express Server**: RESTful API endpoints
- **Socket.io**: Real-time signaling for WebRTC
- **Room Management**: In-memory room and user tracking

### WebRTC Flow
1. User creates/joins room via signaling server
2. Signaling server facilitates peer discovery
3. WebRTC establishes direct peer-to-peer connections
4. Files transfer directly between peers (encrypted)

## Key Features Implementation

### Room Management
- Unique 6-character room IDs
- Optional password protection
- Automatic cleanup of empty rooms
- Real-time user tracking

### File Transfer
- Chunked file transfer for large files
- Progress tracking and resume capability
- Multiple file type support
- One-to-one and one-to-many transfers

### Security
- End-to-end encryption via WebRTC DTLS
- No server-side file storage
- Secure random room ID generation
- Optional room passwords

### Cross-Platform Support
- Responsive web design
- Mobile-optimized touch interactions
- QR code generation for easy mobile joining
- Progressive Web App features

## API Endpoints

### Health Check
```
GET /api/health
```

### Room Information
```
GET /api/room/:roomId
```

## Socket.io Events

### Client → Server
- `create-room`: Create a new room
- `join-room`: Join existing room
- `change-name`: Change user display name
- `offer`, `answer`, `ice-candidate`: WebRTC signaling

### Server → Client
- `room-created`: Room creation confirmation
- `room-joined`: Room join confirmation
- `room-error`: Room operation errors
- `user-joined`, `user-left`: User management
- `offer`, `answer`, `ice-candidate`: WebRTC signaling

## Development Tips

### Testing WebRTC Locally
- Open multiple browser tabs/windows
- Use different browsers for testing
- Test on different devices on the same network

### Debugging
- Enable browser developer tools
- Check console for WebRTC connection logs
- Monitor network tab for WebSocket connections

### Performance Optimization
- File chunking prevents memory overload
- Progress throttling reduces UI updates
- Automatic peer connection cleanup

## Troubleshooting

### Common Issues

**WebRTC Connection Failures:**
- Check firewall settings
- Ensure STUN servers are accessible
- Verify browser WebRTC support

**Socket.io Connection Issues:**
- Check CORS configuration
- Verify WebSocket support
- Check network connectivity

**File Transfer Problems:**
- Verify file size limits
- Check browser file API support
- Monitor memory usage for large files

### Browser Compatibility
- Chrome/Chromium: Full support
- Firefox: Full support
- Safari: Full support (iOS 11+)
- Edge: Full support

## Security Considerations

### Data Protection
- Files never touch the server
- All transfers use WebRTC encryption
- Room passwords are hashed
- No persistent user data storage

### Network Security
- HTTPS required in production
- Secure WebSocket connections
- Content Security Policy headers
- Rate limiting on signaling server

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- Use ESLint configuration
- Follow React best practices
- Write meaningful commit messages
- Document complex functions

## License

MIT License - see LICENSE file for details.

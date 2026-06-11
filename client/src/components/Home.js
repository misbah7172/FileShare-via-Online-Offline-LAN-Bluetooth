import React, { useState, useEffect } from 'react';
import { Plus, LogIn, Lock, AlertCircle, Loader, Check } from 'lucide-react';
import { isValidRoomId } from '../services/utils';

const Home = ({ socket, onRoomCreated, onRoomJoined, initialRoomData, onLANMode, onFTPMode }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (initialRoomData?.roomId && initialRoomData?.isJoining) {
      setJoinRoomId(initialRoomData.roomId);
      setIsJoining(false);
      console.log('🔗 Direct room access detected for room:', initialRoomData.roomId);
    }
  }, [initialRoomData]);

  useEffect(() => {
    if (socket && isConnected && initialRoomData?.roomId && initialRoomData?.isJoining && !isJoining) {
      setIsJoining(true);
      socket.emit('join-room', { 
        roomId: initialRoomData.roomId, 
        password: null 
      });
    }
  }, [socket, isConnected, initialRoomData, isJoining]);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      setError('');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    setIsConnected(socket.connected);

    const handleRoomCreated = (data) => {
      setIsCreating(false);
      onRoomCreated(data);
    };

    const handleRoomJoined = (data) => {
      setIsJoining(false);
      onRoomJoined(data);
    };

    const handleRoomError = (data) => {
      setError(data.message);
      setIsCreating(false);
      setIsJoining(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room-created', handleRoomCreated);
    socket.on('room-joined', handleRoomJoined);
    socket.on('room-error', handleRoomError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room-created', handleRoomCreated);
      socket.off('room-joined', handleRoomJoined);
      socket.off('room-error', handleRoomError);
    };
  }, [socket, onRoomCreated, onRoomJoined]);

  const createRoom = () => {
    if (!socket || !socket.connected) {
      setError('Not connected to server');
      return;
    }
    setError('');
    setIsCreating(true);
    socket.emit('create-room', { password: createPassword || undefined });
  };

  const joinRoom = () => {
    if (!socket || !socket.connected) {
      setError('Not connected to server');
      return;
    }
    if (!joinRoomId.trim() || !isValidRoomId(joinRoomId.trim().toUpperCase())) {
      setError('Invalid room ID');
      return;
    }
    setError('');
    setIsJoining(true);
    socket.emit('join-room', { 
      roomId: joinRoomId.trim().toUpperCase(),
      password: roomPassword || undefined
    });
  };

  return (
    <div className="home">
      <div className="mode-indicators">
        <div className="mode-indicator wifi">
          <span>⚡ WiFi Mode (P2P)</span>
          <p>Direct browser-to-browser transfer. Best for same WiFi or stable internet.</p>
        </div>
        <div className="mode-indicator lan">
          <span>🏠 LAN Mode (Local)</span>
          <p>Automatic discovery of devices on your local network. No room IDs needed.</p>
        </div>
        <div className="mode-indicator remote">
          <span>🌐 Internet Mode (Remote)</span>
          <p>Reliable sharing via server relay. Best for remote users across different networks.</p>
        </div>
      </div>
      
      <div className="hero-section">
        <h2 className="hero-title">Secure File Sharing <span className="text-gradient">3-Way</span></h2>
        <p className="hero-description">
          Choose the best way to share your files based on where you and your recipients are.
        </p>
        
        <div className="action-cards">
          {/* WiFi Mode Card */}
          <div className="card action-card wifi-card">
            <div className="card-header">
              <Plus size={24} className="card-icon" />
              <h3>WiFi Mode (P2P)</h3>
            </div>
            <div className="form-group">
              <input
                type="password"
                className="form-input"
                placeholder="Password (Optional)"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
              />
            </div>
            <button className="btn btn-primary w-full mb-4" onClick={createRoom} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create WiFi Room'}
            </button>
            <div className="divider"><span>OR JOIN</span></div>
            <div className="form-group">
              <input
                type="text"
                className="form-input"
                placeholder="Room ID"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                maxLength={6}
              />
            </div>
            <button className="btn btn-secondary w-full" onClick={joinRoom} disabled={isJoining || !joinRoomId}>
              {isJoining ? 'Joining...' : 'Join Room'}
            </button>
          </div>

          {/* LAN Mode Card */}
          <div className="card action-card lan-card">
            <div className="card-header">
              <Check size={24} className="card-icon success" />
              <h3>LAN Mode (Local)</h3>
            </div>
            <p className="card-description">Scan your local network for other devices running FileShare.</p>
            <div className="mt-auto">
              <button className="btn btn-success w-full" onClick={onLANMode}>
                Find Local Devices
              </button>
            </div>
          </div>

          {/* Remote Mode Card */}
          <div className="card action-card remote-card">
            <div className="card-header">
              <LogIn size={24} className="card-icon indigo" />
              <h3>Internet Mode (Remote)</h3>
            </div>
            <p className="card-description">Upload files to the server and share links. Works anywhere.</p>
            <div className="mt-auto">
              <button className="btn btn-indigo w-full" onClick={onFTPMode}>
                Start Remote Sharing
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </div>

      <style jsx>{`
        .home {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }

        .text-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .mode-indicators {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .mode-indicator {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          padding: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .mode-indicator span {
          font-weight: 700;
          font-size: 0.8rem;
          text-transform: uppercase;
          display: block;
          margin-bottom: 0.25rem;
        }

        .wifi span { color: #667eea; }
        .lan span { color: #22c55e; }
        .remote span { color: #818cf8; }

        .mode-indicator p {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.75rem;
          margin: 0;
        }

        .hero-section {
          text-align: center;
        }

        .hero-title {
          font-size: 2.2rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
        }

        .hero-description {
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 2rem;
        }

        .action-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .action-card {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          height: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-top: 4px solid #667eea;
        }

        .lan-card { border-top-color: #22c55e; }
        .remote-card { border-top-color: #818cf8; }

        .card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .card-header h3 {
          font-size: 1.3rem;
          margin: 0;
        }

        .card-icon.success { color: #22c55e; }
        .card-icon.indigo { color: #818cf8; }

        .divider {
          display: flex;
          align-items: center;
          margin: 1rem 0;
          color: rgba(255, 255, 255, 0.3);
          font-size: 0.7rem;
          font-weight: 700;
        }

        .divider::before, .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .divider span { padding: 0 0.5rem; }

        .btn-success { background: #22c55e; color: white; }
        .btn-indigo { background: #6366f1; color: white; }
        .mt-auto { margin-top: auto; }
        .mb-4 { margin-bottom: 1rem; }

        @media (max-width: 768px) {
          .hero-title { font-size: 1.8rem; }
        }
      `}</style>
    </div>
  );
};

export default Home;

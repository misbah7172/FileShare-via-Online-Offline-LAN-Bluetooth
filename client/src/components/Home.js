import React, { useState, useEffect } from 'react';
import { Plus, LogIn, Lock, AlertCircle, Loader, Check } from 'lucide-react';
import { isValidRoomId } from '../services/utils';

const Home = ({ socket, onRoomCreated, onRoomJoined, initialRoomData }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [error, setError] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (initialRoomData?.roomId && initialRoomData?.isJoining) {
      setJoinRoomId(initialRoomData.roomId);
      setIsJoining(false); // Don't set to true immediately
      console.log('🔗 Direct room access detected for room:', initialRoomData.roomId);
    }
  }, [initialRoomData]);

  // Auto-join room when socket connects and we have initial room data
  useEffect(() => {
    if (socket && isConnected && initialRoomData?.roomId && initialRoomData?.isJoining && !isJoining) {
      console.log('🚀 Auto-joining room from direct URL:', initialRoomData.roomId);
      setIsJoining(true);
      socket.emit('join-room', { 
        roomId: initialRoomData.roomId, 
        password: null 
      });
    }
  }, [socket, isConnected, initialRoomData, isJoining]);

  useEffect(() => {
    if (!socket) return;

    // Track connection status
    const handleConnect = () => {
      setIsConnected(true);
      setError('');
      console.log('✅ Socket connected in Home component!');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setError('Connection lost. Reconnecting...');
      console.log('❌ Socket disconnected in Home component');
    };

    const handleConnectError = () => {
      setIsConnected(false);
      setError('Failed to connect to server');
    };

    // Set initial connection status
    setIsConnected(socket.connected);

    // Auto-test connection every 10 seconds
    const testInterval = setInterval(() => {
      if (socket && socket.connected) {
        console.log('🔄 Auto-testing socket connection...');
        socket.emit('test-connection', { message: 'Auto-test from React app', timestamp: Date.now() });
      }
    }, 10000);

    const handleRoomCreated = (data) => {
      console.log('🎉 Room created successfully:', data);
      console.log('📋 Room creation data:', JSON.stringify(data, null, 2));
      console.log('🔄 Calling onRoomCreated callback...');
      setIsCreating(false);
      onRoomCreated(data);
      console.log('✅ onRoomCreated callback completed');
    };

    const handleRoomJoined = (data) => {
      console.log('🚪 Room joined successfully:', data);
      setIsJoining(false);
      onRoomJoined(data);
    };

    const handleRoomError = (data) => {
      console.error('❌ Room error:', data);
      setError(data.message);
      setIsCreating(false);
      setIsJoining(false);
    };

    const handleTestResponse = (data) => {
      console.log('🧪 Test response received:', data);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('room-created', handleRoomCreated);
    socket.on('room-joined', handleRoomJoined);
    socket.on('room-error', handleRoomError);
    socket.on('test-response', handleTestResponse);

    return () => {
      clearInterval(testInterval);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('room-created', handleRoomCreated);
      socket.off('room-joined', handleRoomJoined);
      socket.off('room-error', handleRoomError);
      socket.off('test-response', handleTestResponse);
    };
  }, [socket, onRoomCreated, onRoomJoined]);

  const testConnection = () => {
    console.log('🧪 Testing socket connection...');
    console.log('Socket instance:', socket);
    console.log('Socket connected:', socket?.connected);
    console.log('Socket ID:', socket?.id);
    
    if (socket) {
      socket.emit('test-connection', { message: 'Hello from client!' });
      console.log('✅ Test event emitted');
    } else {
      console.error('❌ No socket instance');
    }
  };

  const createRoom = () => {
    console.log('🎯 CREATE ROOM BUTTON CLICKED!');
    console.log('💾 Current state - isCreating:', isCreating);
    console.log('💾 Current state - socket:', socket);
    console.log('💾 Current state - socket.connected:', socket?.connected);
    
    if (!socket) {
      console.error('❌ Socket is null/undefined');
      setError('Connection not established');
      return;
    }

    if (!socket.connected) {
      console.error('❌ Socket is not connected');
      setError('Not connected to server');
      return;
    }

    console.log('🏠 Attempting to create room...');
    console.log('📡 Socket connected:', socket.connected);
    console.log('🔌 Socket ID:', socket.id);

    setError('');
    setIsCreating(true);
    
    const roomData = { 
      password: createPassword || undefined 
    };
    
    console.log('📤 About to emit create-room event with data:', roomData);
    
    socket.emit('create-room', roomData);
    
    console.log('✅ Emitted create-room event successfully');
  };

  const joinRoom = () => {
    if (!socket) {
      setError('Connection not established');
      return;
    }

    if (!socket.connected) {
      setError('Not connected to server. Please wait and try again.');
      return;
    }

    if (!joinRoomId.trim()) {
      setError('Please enter a room ID');
      return;
    }

    if (!isValidRoomId(joinRoomId.trim().toUpperCase())) {
      setError('Invalid room ID format');
      return;
    }

    setError('');
    setIsJoining(true);
    
    socket.emit('join-room', { 
      roomId: joinRoomId.trim().toUpperCase(),
      password: roomPassword || undefined
    });
  };

  const handleJoinRoomIdChange = (e) => {
    const value = e.target.value.toUpperCase();
    setJoinRoomId(value);
    setError('');
  };

  return (
    <div className="home">
      <div className="mode-info">
        <div className="mode-indicator internet">
          <span>🌐 Internet Mode</span>
          <p>Connect with devices anywhere in the world. Switch to LAN Mode for local network sharing or FTP Mode for offline file server functionality.</p>
        </div>
      </div>
      
      <div className="hero-section">
        <h2 className="hero-title">Secure File Sharing Made Simple</h2>
        <p className="hero-description">
          Share files directly between devices with end-to-end encryption. 
          No accounts, no uploads to servers, no limits.
        </p>
        
        <div className="action-cards">
          {/* Test Connection Button */}
          <div className="card action-card">
            <div className="card-header">
              <AlertCircle size={24} className="card-icon" />
              <h3>Test Connection</h3>
            </div>
            <button 
              className="btn btn-secondary w-full"
              onClick={testConnection}
            >
              Test Socket Connection
            </button>
          </div>

          {/* Create Room Card */}
          <div className="card action-card">
            <div className="card-header">
              <Plus size={24} className="card-icon" />
              <h3>Create Room</h3>
            </div>
            <p className="card-description">
              Start a new room and invite others to join for file sharing.
            </p>
            
            <div className="form-group">
              <label className="form-label">
                <Lock size={16} />
                Room Password (Optional)
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Leave empty for no password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                disabled={isCreating}
              />
            </div>

            <button 
              className="btn btn-primary w-full"
              onClick={createRoom}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader size={16} className="spin" />
                  Creating Room...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Create Room
                </>
              )}
            </button>
          </div>

          {/* Join Room Card */}
          <div className="card action-card">
            <div className="card-header">
              <LogIn size={24} className="card-icon" />
              <h3>Join Room</h3>
            </div>
            <p className="card-description">
              Enter a room ID to join an existing file sharing session.
            </p>
            
            <div className="form-group">
              <label className="form-label">Room ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter 6-character room ID"
                value={joinRoomId}
                onChange={handleJoinRoomIdChange}
                maxLength={6}
                disabled={isJoining}
                style={{ fontFamily: 'monospace', letterSpacing: '2px' }}
              />
            </div>

            {showPasswordField && (
              <div className="form-group">
                <label className="form-label">
                  <Lock size={16} />
                  Room Password
                </label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter room password"
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                  disabled={isJoining}
                />
              </div>
            )}

            <div className="flex gap-2">
              <button 
                className="btn btn-primary flex-1"
                onClick={joinRoom}
                disabled={isJoining || !joinRoomId.trim()}
              >
                {isJoining ? (
                  <>
                    <Loader size={16} className="spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    Join Room
                  </>
                )}
              </button>
              
              {!showPasswordField && (
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowPasswordField(true)}
                  disabled={isJoining || !isConnected}
                  title="This room requires a password"
                >
                  <Lock size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {!isConnected && !error && (
          <div className="alert alert-warning">
            <Loader size={16} className="spin" />
            Connecting to server...
          </div>
        )}

        {isConnected && !error && (
          <div className="alert alert-success">
            <Check size={16} />
            Connected to server
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="features-section">
        <h3 className="features-title">Why Choose FileShare?</h3>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h4>End-to-End Encryption</h4>
            <p>All files are encrypted during transfer. Your data never touches our servers.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h4>Real-Time Transfer</h4>
            <p>Direct peer-to-peer connection for maximum speed and efficiency.</p>
          </div>
          
          <div className="feature-card">
            <div className="icon">🌐</div>
            <h4>Cross-Platform</h4>
            <p>Works on any device with a web browser. No apps to install.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h4>Multi-User Support</h4>
            <p>Share files with multiple people simultaneously in the same room.</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .home {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
        }

        .mode-info {
          margin-bottom: 2rem;
        }

        .mode-indicator {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          text-align: center;
        }

        .mode-indicator.internet {
          border-color: rgba(34, 197, 94, 0.3);
          background: rgba(34, 197, 94, 0.1);
        }

        .mode-indicator span {
          font-weight: 600;
          color: #22c55e;
          font-size: 1rem;
          display: block;
          margin-bottom: 0.5rem;
        }

        .mode-indicator p {
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
          font-size: 0.9rem;
        }

        .hero-section {
          text-align: center;
          margin-bottom: 4rem;
        }

        .hero-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: white;
          margin-bottom: 1rem;
        }

        .hero-description {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 3rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .action-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .action-card {
          text-align: left;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .card-header h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }

        .card-icon {
          color: #667eea;
        }

        .card-description {
          color: rgba(0, 0, 0, 0.7);
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        @media (prefers-color-scheme: dark) {
          .card-description {
            color: rgba(255, 255, 255, 0.7);
          }
        }

        .features-section {
          margin-top: 4rem;
        }

        .features-title {
          text-align: center;
          font-size: 2rem;
          font-weight: 600;
          color: white;
          margin-bottom: 2rem;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .feature-icon {
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        .feature-card h4 {
          color: white;
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .feature-card p {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          line-height: 1.4;
          margin: 0;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2rem;
          }
          
          .hero-description {
            font-size: 1rem;
          }
          
          .action-cards {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          
          .features-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;

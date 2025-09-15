import React, { useState, useEffect } from 'react';
import { 
  Wifi, WifiOff, Search, RefreshCw, Monitor, 
  Users, Shield, Clock, CheckCircle, AlertCircle,
  Smartphone, Laptop, Server, Router
} from 'lucide-react';

const LANMode = ({ socket, onRoomCreated, onJoinRoom }) => {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [devices, setDevices] = useState([]);
  const [localDevice, setLocalDevice] = useState(null);
  const [connectivity, setConnectivity] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinRoomPassword, setJoinRoomPassword] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');

  useEffect(() => {
    if (!socket) return;

    // Listen for LAN discovery events
    socket.on('lan-devices-discovered', (data) => {
      console.log('🔍 Devices discovered:', data);
      setDevices(data.devices || []);
      setLocalDevice(data.localDevice);
      setIsDiscovering(false);
    });

    socket.on('lan-devices-list', (data) => {
      setDevices(data.devices || []);
      setLocalDevice(data.localDevice);
    });

    socket.on('connectivity-status', (data) => {
      setConnectivity(data);
    });

    socket.on('lan-room-available', (roomData) => {
      setAvailableRooms(prev => {
        const existing = prev.find(r => r.roomId === roomData.roomId);
        if (!existing) {
          return [...prev, { ...roomData, timestamp: Date.now() }];
        }
        return prev;
      });
    });

    socket.on('lan-room-created', (data) => {
      console.log('🏠 LAN Room created:', data);
      onRoomCreated && onRoomCreated(data);
    });

    // Check connectivity on mount
    socket.emit('check-connectivity');
    
    // Get current devices
    socket.emit('get-lan-devices');

    return () => {
      socket.off('lan-devices-discovered');
      socket.off('lan-devices-list');
      socket.off('connectivity-status');
      socket.off('lan-room-available');
      socket.off('lan-room-created');
    };
  }, [socket, onRoomCreated]);

  const discoverDevices = () => {
    if (!socket) return;
    
    setIsDiscovering(true);
    socket.emit('discover-lan-devices');
    
    // Timeout discovery after 5 seconds
    setTimeout(() => {
      setIsDiscovering(false);
    }, 5000);
  };

  const refreshDevices = () => {
    if (!socket) return;
    socket.emit('get-lan-devices');
  };

  const createLANRoom = () => {
    if (!socket) return;
    
    socket.emit('create-lan-room', {
      roomName: roomName || `${localDevice?.hostname || 'Device'}'s Room`,
      password: roomPassword || null
    });
    
    setShowCreateRoom(false);
    setRoomName('');
    setRoomPassword('');
  };

  const joinLANRoom = (roomId, hasPassword = false) => {
    if (hasPassword) {
      const password = prompt('Enter room password:');
      if (!password) return;
      onJoinRoom && onJoinRoom({ roomId, password });
    } else {
      onJoinRoom && onJoinRoom({ roomId });
    }
  };

  const joinRoomManually = () => {
    if (!joinRoomId.trim()) {
      alert('Please enter a room ID');
      return;
    }
    
    if (joinRoomPassword.trim()) {
      onJoinRoom && onJoinRoom({ roomId: joinRoomId.trim(), password: joinRoomPassword });
    } else {
      onJoinRoom && onJoinRoom({ roomId: joinRoomId.trim() });
    }
    
    setShowJoinRoom(false);
    setJoinRoomId('');
    setJoinRoomPassword('');
  };

  const getDeviceIcon = (device) => {
    const platform = device.platform?.toLowerCase() || '';
    if (platform.includes('win')) return <Monitor className="w-5 h-5" />;
    if (platform.includes('darwin')) return <Laptop className="w-5 h-5" />;
    if (platform.includes('linux')) return <Server className="w-5 h-5" />;
    if (platform.includes('android') || platform.includes('ios')) return <Smartphone className="w-5 h-5" />;
    return <Router className="w-5 h-5" />;
  };

  const formatTimestamp = (timestamp) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <div className="lan-mode">
      <div className="lan-header">
        <div className="connectivity-status">
          {connectivity?.hasInternet ? (
            <div className="status-indicator online">
              <Wifi className="w-4 h-4" />
              <span>Online</span>
            </div>
          ) : (
            <div className="status-indicator offline">
              <WifiOff className="w-4 h-4" />
              <span>Offline - LAN Mode</span>
            </div>
          )}
        </div>
        
        <h2>Local Network File Sharing</h2>
        <p>Share files directly with devices on your local network</p>
      </div>

      {localDevice && (
        <div className="local-device-info">
          <h3>Your Device</h3>
          <div className="device-card local">
            {getDeviceIcon(localDevice)}
            <div className="device-details">
              <div className="device-name">{localDevice.hostname}</div>
              <div className="device-meta">
                <span className="device-platform">{localDevice.platform}</span>
                <span className="device-id">ID: {localDevice.deviceId}</span>
              </div>
              <div className="device-interfaces">
                {localDevice.interfaces?.map((iface, index) => (
                  <span key={index} className="interface">
                    {iface.interface}: {iface.address}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="lan-actions">
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateRoom(true)}
        >
          <Users className="w-4 h-4" />
          Create LAN Room
        </button>
        
        <button
          className="btn btn-primary"
          onClick={() => setShowJoinRoom(true)}
        >
          <Users className="w-4 h-4" />
          Join Room
        </button>
        
        <button
          className="btn btn-secondary"
          onClick={discoverDevices}
          disabled={isDiscovering}
        >
          {isDiscovering ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {isDiscovering ? 'Discovering...' : 'Discover Devices'}
        </button>
        
        <button
          className="btn btn-secondary"
          onClick={refreshDevices}
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {devices.length > 0 && (
        <div className="discovered-devices">
          <h3>Discovered Devices ({devices.length})</h3>
          <div className="devices-grid">
            {devices.map((device) => (
              <div key={device.deviceId} className="device-card">
                {getDeviceIcon(device)}
                <div className="device-details">
                  <div className="device-name">{device.hostname}</div>
                  <div className="device-meta">
                    <span className="device-platform">{device.platform}</span>
                    <span className="device-ip">{device.address}</span>
                  </div>
                  <div className="device-status">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span>Last seen: {formatTimestamp(device.lastSeen)}</span>
                  </div>
                </div>
                <div className="device-actions">
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => window.open(`http://${device.address}:${device.fileSharePort || 3001}`, '_blank')}
                  >
                    Connect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {availableRooms.length > 0 && (
        <div className="available-rooms">
          <h3>Available LAN Rooms ({availableRooms.length})</h3>
          <div className="rooms-list">
            {availableRooms.map((room) => (
              <div key={room.roomId} className="room-card">
                <div className="room-info">
                  <div className="room-name">{room.roomName}</div>
                  <div className="room-meta">
                    <span className="room-host">Host: {room.host}</span>
                    {room.hasPassword && (
                      <span className="room-protected">
                        <Shield className="w-3 h-3" />
                        Protected
                      </span>
                    )}
                  </div>
                  <div className="room-timestamp">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(room.timestamp)}
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => joinLANRoom(room.roomId, room.hasPassword)}
                >
                  Join Room
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {devices.length === 0 && !isDiscovering && (
        <div className="no-devices">
          <AlertCircle className="w-12 h-12 text-gray-400" />
          <h3>No devices discovered</h3>
          <p>Make sure other devices are running FileShare on the same network</p>
          <button className="btn btn-primary" onClick={discoverDevices}>
            <Search className="w-4 h-4" />
            Start Discovery
          </button>
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateRoom && (
        <div className="modal-overlay" onClick={() => setShowCreateRoom(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Create LAN Room</h3>
            <div className="form-group">
              <label>Room Name</label>
              <input
                type="text"
                className="form-input"
                placeholder={`${localDevice?.hostname || 'Device'}'s Room`}
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Password (Optional)</label>
              <input
                type="password"
                className="form-input"
                placeholder="Leave empty for no password"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCreateRoom(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={createLANRoom}
              >
                Create Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {showJoinRoom && (
        <div className="modal-overlay" onClick={() => setShowJoinRoom(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Join Room</h3>
            <div className="form-group">
              <label>Room ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter 6-character room ID (e.g., ABC123)"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                maxLength={6}
                style={{ fontFamily: 'monospace', letterSpacing: '2px' }}
              />
            </div>
            <div className="form-group">
              <label>Password (Optional)</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter password if room is protected"
                value={joinRoomPassword}
                onChange={(e) => setJoinRoomPassword(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowJoinRoom(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={joinRoomManually}
                disabled={!joinRoomId.trim()}
              >
                Join Room
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .lan-mode {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem;
        }

        .lan-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .connectivity-status {
          display: flex;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .status-indicator.online {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
        }

        .status-indicator.offline {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .local-device-info {
          margin-bottom: 2rem;
        }

        .local-device-info h3 {
          margin-bottom: 1rem;
          color: white;
        }

        .device-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 1rem;
        }

        .device-card.local {
          background: rgba(102, 126, 234, 0.2);
          border-color: rgba(102, 126, 234, 0.3);
        }

        .device-details {
          flex: 1;
        }

        .device-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
          margin-bottom: 0.25rem;
        }

        .device-meta {
          display: flex;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .device-meta span {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .device-interfaces {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .interface {
          font-size: 0.8rem;
          background: rgba(255, 255, 255, 0.1);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          color: rgba(255, 255, 255, 0.8);
        }

        .device-status {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .lan-actions {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .devices-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1rem;
        }

        .device-actions {
          display: flex;
          gap: 0.5rem;
        }

        .rooms-list {
          display: grid;
          gap: 1rem;
        }

        .room-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .room-info {
          flex: 1;
        }

        .room-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
          margin-bottom: 0.25rem;
        }

        .room-meta {
          display: flex;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .room-meta span {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .room-timestamp {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .no-devices {
          text-align: center;
          padding: 3rem 2rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .no-devices h3 {
          margin: 1rem 0;
          color: white;
        }

        .discovered-devices h3,
        .available-rooms h3 {
          margin-bottom: 1rem;
          color: white;
        }

        .modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: rgba(17, 24, 39, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          padding: 2rem;
          width: 90%;
          max-width: 400px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .modal-header h2 {
          color: white;
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
        }

        .modal-header p {
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
          font-size: 0.9rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          color: white;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 1rem;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: #22c55e;
        }

        .room-id-input {
          font-family: 'Courier New', monospace;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          text-align: center;
        }

        .button-group {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .button-group button {
          flex: 1;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-button {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .cancel-button:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .join-button {
          background: #22c55e;
          color: white;
        }

        .join-button:hover {
          background: #16a34a;
          transform: translateY(-1px);
        }

        .join-button:disabled {
          background: rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.5);
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 768px) {
          .lan-mode {
            padding: 1rem;
          }

          .lan-actions {
            flex-direction: column;
          }

          .devices-grid {
            grid-template-columns: 1fr;
          }

          .device-card {
            flex-direction: column;
            text-align: center;
          }

          .room-card {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

export default LANMode;

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Copy, 
  QrCode, 
  Upload, 
  Check, 
  AlertCircle,
  Zap,
  LogOut
} from 'lucide-react';
import QRCodeDisplay from './QRCodeDisplay';
import FileTransfer from './FileTransfer';
import UserList from './UserList';
import ConnectionStatus from './ConnectionStatus';
import WebRTCManager from '../services/webrtc';
import { copyToClipboard, generateTransferId } from '../services/utils';

// Utility functions for blob storage
const blobToBase64 = (blob) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

const base64ToBlob = (base64, type) => {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type });
};

const Room = ({ socket, roomData, onLeaveRoom }) => {
  const [users, setUsers] = useState([]);
  const [connectedPeers, setConnectedPeers] = useState(new Set());
  const [showQR, setShowQR] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [sharedFiles, setSharedFiles] = useState([]); // Centralized shared files list
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [error, setError] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const webrtcRef = useRef(null);
  const fileInputRef = useRef(null);

  const roomLink = `${window.location.origin}/room/${roomData.roomId}`;

  useEffect(() => {
    if (!socket || !roomData) return;

    // Initialize users from room data
    if (roomData.users) {
      setUsers(roomData.users);
    }

    // Load existing file transfers from localStorage
    const storageKey = `fileTransfers_${roomData.roomId}`;
    const savedTransfers = localStorage.getItem(storageKey);
    if (savedTransfers) {
      try {
        const transfers = JSON.parse(savedTransfers);
        console.log('📁 Loading', transfers.length, 'saved transfers from localStorage');
        
        // Convert base64 back to blobs and only keep completed transfers
        const completedTransfers = [];
        for (const t of transfers) {
          if (t.status === 'completed' && t.blob && t.direction === 'incoming') {
            try {
              const restoredBlob = typeof t.blob === 'string' ? base64ToBlob(t.blob, t.fileType) : t.blob;
              completedTransfers.push({
                ...t,
                blob: restoredBlob
              });
            } catch (blobError) {
              console.warn('Failed to restore blob for', t.fileName, blobError);
            }
          }
        }
        
        console.log('📁 Restored', completedTransfers.length, 'files from storage');
        setSharedFiles(completedTransfers); // Only add to shared files
      } catch (error) {
        console.error('Error loading saved transfers:', error);
        localStorage.removeItem(storageKey);
      }
    }

    // Initialize WebRTC manager
    webrtcRef.current = new WebRTCManager(socket, roomData.roomId);
    
    setupWebRTCHandlers();
    setupSocketHandlers();
    setConnectionStatus('connected');

    // Connect to existing users
    const otherUsers = roomData.users?.filter(user => !user.isCurrentUser) || [];
    otherUsers.forEach(user => {
      webrtcRef.current.connectToPeer(user.userId);
    });

    return () => {
      if (webrtcRef.current) {
        webrtcRef.current.destroy();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomData]);

  // Create a deduplicated list of transfers for display
  const displayTransfers = React.useMemo(() => {
    // Since we're now only using sharedFiles, just return sharedFiles
    // The deduplication will be handled by the periodic cleanup
    return sharedFiles;
  }, [sharedFiles]);

  const deduplicateSharedFiles = () => {
    setSharedFiles(prev => {
      const seen = new Set();
      const deduplicated = [];
      
      for (const file of prev) {
        // Create a unique key based on fileName, fromUserId, and timestamp (within 5 seconds)
        const timeKey = Math.floor(file.timestamp / 5000) * 5000; // Round to 5-second buckets
        const key = `${file.fileName}-${file.fromUserId}-${timeKey}`;
        
        if (!seen.has(key)) {
          seen.add(key);
          deduplicated.push(file);
        } else {
          console.log('🗑️ Removing duplicate file:', file.fileName, 'from', file.fromUserId);
        }
      }
      
      if (deduplicated.length !== prev.length) {
        console.log('🧹 Deduplicated shared files:', prev.length, '→', deduplicated.length);
        return deduplicated;
      }
      return prev;
    });
  };

  // Deduplicate files every 10 seconds
  useEffect(() => {
    const interval = setInterval(deduplicateSharedFiles, 10000);
    return () => clearInterval(interval);
  }, []);

  const setupWebRTCHandlers = () => {
    const webrtc = webrtcRef.current;
    
    webrtc.onPeerConnected = (userId) => {
      setConnectedPeers(prev => new Set([...prev, userId]));
      setError('');
      
      // When a peer connects, share our available files
      setTimeout(() => {
        broadcastFileAvailability();
      }, 1000);
    };

    webrtc.onPeerDisconnected = (userId) => {
      setConnectedPeers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    };

    webrtc.onPeerError = (userId, error) => {
      console.error('🚨 WebRTC peer error:', userId, error);
      setError(`Connection error with peer: ${error}`);
      
      // Try to reconnect after a short delay
      setTimeout(() => {
        console.log('🔄 Attempting to reconnect to peer:', userId);
        webrtc.connectToPeer(userId);
      }, 3000);
    };

    webrtc.onFileOffer = (userId, offer) => {
      const transfer = {
        id: offer.transferId,
        fromUserId: userId,
        fileName: offer.fileName,
        fileSize: offer.fileSize,
        fileType: offer.fileType,
        status: 'pending',
        direction: 'incoming',
        timestamp: Date.now()
      };
      
      // Add incoming file offer to shared files
      setSharedFiles(prev => {
        const exists = prev.find(f => f.id === offer.transferId);
        if (!exists) {
          return [...prev, transfer];
        }
        return prev;
      });
      
      // Auto-accept file transfers
      setTimeout(() => {
        webrtc.acceptFileTransfer(userId, offer.transferId);
      }, 100);
    };

    webrtc.onFileProgress = (userId, transferId, progress, sent, total) => {
      setSharedFiles(prev =>
        prev.map(transfer =>
          transfer.id === transferId
            ? { ...transfer, progress, sent, total, status: 'transferring' }
            : transfer
        )
      );
    };

    webrtc.onFileComplete = (userId, transferId) => {
      setSharedFiles(prev =>
        prev.map(transfer =>
          transfer.id === transferId
            ? { ...transfer, status: 'completed', progress: 100 }
            : transfer
        )
      );
    };

    webrtc.onFileReceived = async (userId, transferId, blob, fileName) => {
      console.log('📥 File received:', fileName, 'from user:', userId);
      
      // Update or add the file to shared files with the actual blob
      setSharedFiles(prev => {
        const existingIndex = prev.findIndex(f => f.id === transferId);
        if (existingIndex >= 0) {
          // Update existing entry with blob
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            status: 'completed',
            blob,
            progress: 100
          };
          return updated;
        } else {
          // Add new entry if somehow not found
          const sharedFile = {
            id: transferId,
            fileName,
            fileSize: blob.size,
            fileType: blob.type,
            blob,
            fromUserId: userId,
            timestamp: Date.now(),
            status: 'completed',
            direction: 'incoming',
            progress: 100
          };
          return [...prev, sharedFile];
        }
      });
      
      // Save to localStorage for persistence
      try {
        const storageKey = `fileTransfers_${roomData.roomId}`;
        const base64Blob = await blobToBase64(blob);
        
        const savedFile = {
          id: transferId,
          fileName,
          fileSize: blob.size,
          fileType: blob.type,
          blob: base64Blob,
          fromUserId: userId,
          timestamp: Date.now(),
          status: 'completed',
          direction: 'incoming'
        };
        
        // Get existing saved files and add new one
        const existingSaved = localStorage.getItem(storageKey);
        let savedFiles = [];
        if (existingSaved) {
          try {
            savedFiles = JSON.parse(existingSaved);
          } catch (e) {
            console.warn('Failed to parse existing saved files');
          }
        }
        
        // Add new file if not already saved
        const alreadySaved = savedFiles.find(f => f.id === transferId);
        if (!alreadySaved) {
          savedFiles.push(savedFile);
          // Keep only last 20 files
          savedFiles = savedFiles.slice(-20);
          localStorage.setItem(storageKey, JSON.stringify(savedFiles));
          console.log('💾 Saved file to localStorage:', fileName);
        }
      } catch (error) {
        console.error('Error saving file to localStorage:', error);
      }
      
      // Broadcast file availability to all connected peers
      broadcastFileAvailability();
    };

    webrtc.onFileError = (userId, transferId, error) => {
      setSharedFiles(prev =>
        prev.map(transfer =>
          transfer.id === transferId
            ? { ...transfer, status: 'error', error }
            : transfer
        )
      );
    };
    // Set up handlers for getting available files
    webrtc.onGetAvailableFiles = () => {
      return sharedFiles.map(file => ({
        id: file.id,
        fileName: file.fileName,
        fileSize: file.fileSize,
        fileType: file.fileType,
        timestamp: file.timestamp,
        fromUserId: file.fromUserId
      }));
    };

    webrtc.onRemoteFilesReceived = (fromUserId, remoteFiles) => {
      console.log('📥 Received files list from', fromUserId, ':', remoteFiles);
      
      // Only add remote files that we don't have locally and aren't already in the list
      remoteFiles.forEach(remoteFile => {
        setSharedFiles(prev => {
          // Check if we already have this file (either locally or from the same user)
          const exists = prev.find(f => 
            f.id === remoteFile.id || 
            (f.fileName === remoteFile.fileName && f.fromUserId === remoteFile.fromUserId) ||
            (f.fileName === remoteFile.fileName && f.isRemote && f.remoteUserId === fromUserId)
          );
          
          if (!exists) {
            console.log('📋 Adding remote file reference:', remoteFile.fileName, 'from', fromUserId);
            return [...prev, {
              ...remoteFile,
              isRemote: true,
              remoteUserId: fromUserId,
              status: 'available'
            }];
          } else {
            console.log('📋 Remote file already exists:', remoteFile.fileName);
          }
          return prev;
        });
      });
    };
  };

  const setupSocketHandlers = () => {
    socket.on('user-joined', (data) => {
      setUsers(prev => {
        const existingUser = prev.find(u => u.userId === data.userId);
        if (existingUser) return prev;
        
        return [...prev, {
          userId: data.userId,
          userName: data.userName,
          isCurrentUser: false
        }];
      });

      // Connect to new user
      if (webrtcRef.current) {
        webrtcRef.current.connectToPeer(data.userId);
      }
    });

    socket.on('user-left', (data) => {
      setUsers(prev => prev.filter(u => u.userId !== data.userId));
      setConnectedPeers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    socket.on('user-name-changed', (data) => {
      setUsers(prev =>
        prev.map(u =>
          u.userId === data.userId
            ? { ...u, userName: data.newName }
            : u
        )
      );
    });

    socket.on('name-changed', (data) => {
      setUsers(prev =>
        prev.map(u =>
          u.isCurrentUser
            ? { ...u, userName: data.newName }
            : u
        )
      );
      setIsEditingName(false);
    });
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(roomLink);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    files.forEach(file => sendFile(file));
    event.target.value = ''; // Reset input
  };

  const sendFile = async (file) => {
    if (!webrtcRef.current) return;

    const transferId = generateTransferId();
    const connectedUsers = Array.from(connectedPeers);
    
    if (connectedUsers.length === 0) {
      setError('No connected peers to send file to');
      return;
    }

    // Add to shared files immediately for the sender
    const sharedFile = {
      id: transferId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      blob: file,
      fromUserId: currentUser?.userId,
      timestamp: Date.now(),
      status: 'transferring',
      direction: 'outgoing'
    };

    setSharedFiles(prev => {
      const exists = prev.find(f => 
        f.id === transferId || 
        (f.fileName === file.name && f.fromUserId === currentUser?.userId && Math.abs(f.timestamp - sharedFile.timestamp) < 10000)
      );
      if (!exists) {
        console.log('✅ Adding sent file to shared list:', file.name);
        return [...prev, sharedFile];
      }
      return prev;
    });

    try {
      // Send to all connected peers
      for (const userId of connectedUsers) {
        await webrtcRef.current.sendFileToUser(userId, file, `${transferId}-${userId}`);
      }
      
      // Update status to completed
      setSharedFiles(prev =>
        prev.map(f =>
          f.id === transferId
            ? { ...f, status: 'completed' }
            : f
        )
      );

    } catch (error) {
      // Update status to error
      setSharedFiles(prev =>
        prev.map(f =>
          f.id === transferId
            ? { ...f, status: 'error', error: error.message }
            : f
        )
      );
    }
  };

  const acceptFileTransfer = (transferId) => {
    const transfer = sharedFiles.find(t => t.id === transferId);
    if (transfer && webrtcRef.current) {
      webrtcRef.current.acceptFileTransfer(transfer.fromUserId, transferId);
      setSharedFiles(prev =>
        prev.map(t =>
          t.id === transferId
            ? { ...t, status: 'transferring' }
            : t
        )
      );
    }
  };

  const rejectFileTransfer = (transferId) => {
    const transfer = sharedFiles.find(t => t.id === transferId);
    if (transfer && webrtcRef.current) {
      webrtcRef.current.rejectFileTransfer(transfer.fromUserId, transferId);
      setSharedFiles(prev => prev.filter(t => t.id !== transferId));
    }
  };

  const removeTransfer = (transferId) => {
    setSharedFiles(prev => prev.filter(t => t.id !== transferId));
  };

  const broadcastFileAvailability = () => {
    if (!webrtcRef.current) return;
    
    // Get available files list
    const availableFiles = sharedFiles.map(file => ({
      id: file.id,
      fileName: file.fileName,
      fileSize: file.fileSize,
      fileType: file.fileType,
      timestamp: file.timestamp,
      fromUserId: file.fromUserId
    }));
    
    console.log('📡 Broadcasting', availableFiles.length, 'available files to peers');
    
    // Send to all connected peers
    for (const userId of connectedPeers) {
      const peer = webrtcRef.current.peers.get(userId);
      if (peer && peer.connected) {
        peer.sendDataChannelMessage({
          type: 'files-list',
          files: availableFiles
        });
      }
    }
  };

  const handleNameChange = () => {
    if (newName.trim() && newName.trim() !== roomData.userName) {
      socket.emit('change-name', {
        newName: newName.trim(),
        roomId: roomData.roomId
      });
    } else {
      setIsEditingName(false);
    }
  };

  const currentUser = users.find(u => u.isCurrentUser);
  const connectedCount = connectedPeers.size;
  const totalUsers = users.length;

  return (
    <div className="room">
      <div className="room-header">
        <div className="room-info">
          <h2 className="room-title">
            Room: <span className="room-id">{roomData.roomId}</span>
          </h2>
          <div className="room-stats">
            <div className="stat">
              <Users size={16} />
              <span>{totalUsers} user{totalUsers !== 1 ? 's' : ''}</span>
            </div>
            <div className="stat">
              <Zap size={16} />
              <span>{connectedCount} connected</span>
            </div>
          </div>
        </div>
        
        <div className="room-actions">
          <button
            className="btn btn-secondary btn-small"
            onClick={() => setShowQR(!showQR)}
          >
            <QrCode size={16} />
            QR Code
          </button>
          
          <button
            className="btn btn-secondary btn-small"
            onClick={handleCopyLink}
          >
            {copySuccess ? <Check size={16} /> : <Copy size={16} />}
            {copySuccess ? 'Copied!' : 'Copy Link'}
          </button>
          
          <button
            className="btn btn-danger btn-small"
            onClick={onLeaveRoom}
          >
            <LogOut size={16} />
            Leave
          </button>
        </div>
      </div>

      {showQR && (
        <div className="qr-section">
          <QRCodeDisplay url={roomLink} />
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="room-content">
        <div className="left-panel">
          <ConnectionStatus 
            status={connectionStatus}
            connectedPeers={connectedCount}
            totalPeers={totalUsers - 1}
          />
          
          <UserList 
            users={users}
            connectedPeers={connectedPeers}
            currentUser={currentUser}
            onEditName={() => {
              setNewName(currentUser?.userName || '');
              setIsEditingName(true);
            }}
          />
        </div>
        
        <div className="right-panel">
          <div className="file-actions">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            <button
              className="btn btn-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={connectedCount === 0}
            >
              <Upload size={16} />
              Send Files
            </button>
            
            {connectedCount === 0 && (
              <p className="text-muted text-center mt-2">
                Waiting for other users to connect...
              </p>
            )}
          </div>
          
          <FileTransfer
            transfers={displayTransfers}
            onAccept={acceptFileTransfer}
            onReject={rejectFileTransfer}
            onRemove={removeTransfer}
            users={users}
          />
        </div>
      </div>

      {/* Name editing modal */}
      {isEditingName && (
        <div className="modal-overlay" onClick={() => setIsEditingName(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Change Your Name</h3>
            <div className="form-group">
              <input
                type="text"
                className="form-input"
                placeholder="Enter new name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleNameChange()}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setIsEditingName(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleNameChange}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .room {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }

        .room-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .room-info h2 {
          margin: 0 0 0.5rem 0;
          color: white;
          font-size: 1.5rem;
        }

        .room-id {
          font-family: monospace;
          background: rgba(102, 126, 234, 0.2);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          letter-spacing: 2px;
        }

        .room-stats {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
        }

        .room-actions {
          display: flex;
          gap: 0.5rem;
        }

        .qr-section {
          margin-bottom: 2rem;
          text-align: center;
        }

        .room-content {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 2rem;
        }

        .left-panel,
        .right-panel {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .file-actions {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          min-width: 400px;
          max-width: 90vw;
        }

        @media (prefers-color-scheme: dark) {
          .modal {
            background: #2a2a2a;
            color: white;
          }
        }

        .modal h3 {
          margin: 0 0 1rem 0;
          text-align: center;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1rem;
        }

        @media (max-width: 768px) {
          .room-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
          
          .room-content {
            grid-template-columns: 1fr;
          }
          
          .room-actions {
            flex-wrap: wrap;
            justify-content: center;
          }
          
          .modal {
            min-width: auto;
            margin: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Room;

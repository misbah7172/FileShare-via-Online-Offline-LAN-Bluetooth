import React, { useState, useEffect, useCallback } from 'react';
import { 
  Server, 
  Upload, 
  Download, 
  Trash2, 
  RefreshCw, 
  FolderPlus, 
  Key, 
  Users, 
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  HardDrive
} from 'lucide-react';

const FTPMode = () => {
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [files, setFiles] = useState([]);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [message, setMessage] = useState(null);

  // Create room form state
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');

  // Join room form state
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  
  const userId = React.useMemo(() => Math.random().toString(36).substring(7), []);
  const [userName, setUserName] = useState('User_' + userId.substring(0, 3));

  // Determine API base URL
  const getAPIBase = () => {
    const hostname = window.location.hostname;
    if (process.env.NODE_ENV === 'production' || hostname.includes('render.com')) {
      return window.location.origin;
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    return `http://${hostname}:3001`;
  };
  
  const API_BASE = process.env.REACT_APP_FTP_SERVER_URL || getAPIBase();

  const showMessage = useCallback((text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  const refreshRoomData = useCallback(async () => {
    if (!currentRoom) return;
    try {
      const response = await fetch(`${API_BASE}/api/ftp/heartbeat/${currentRoom.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName })
      });
      const data = await response.json();
      if (data.success) {
        setMembers(data.members || []);
        setFiles(data.files || []);
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Heartbeat failed:', error);
    }
  }, [API_BASE, currentRoom, userId, userName]);

  // Auto-refresh every 1s
  useEffect(() => {
    let interval;
    if (currentRoom) {
      interval = setInterval(refreshRoomData, 1000);
    }
    return () => clearInterval(interval);
  }, [currentRoom, refreshRoomData]);

  const loadServerStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ftp/status`);
      const data = await response.json();
      if (data.success) setRooms(data.rooms);
    } catch (error) {
      console.error('Failed to load server status:', error);
    }
  }, [API_BASE]);

  useEffect(() => {
    loadServerStatus();
  }, [loadServerStatus]);

  const createRoom = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/ftp/create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: newRoomName || undefined,
          password: newRoomPassword || undefined
        })
      });
      const data = await response.json();
      if (data.success) {
        showMessage(`Room created! Room ID: ${data.roomId}`);
        setShowCreateRoom(false);
        setNewRoomName('');
        setNewRoomPassword('');
        loadServerStatus();
        setTimeout(() => {
          joinRoom(data.roomId, newRoomPassword);
        }, 1000);
      } else {
        showMessage(data.message, 'error');
      }
    } catch (error) {
      showMessage('Failed to create room: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!chatText.trim() || !currentRoom) return;
    try {
      await fetch(`${API_BASE}/api/ftp/message/${currentRoom.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName, text: chatText })
      });
      setChatText('');
      refreshRoomData();
    } catch (error) {
      showMessage('Failed to send message', 'error');
    }
  };

  const joinRoom = async (roomId, password = '') => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/ftp/join/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, userId, userName })
      });
      const data = await response.json();
      if (data.success) {
        setCurrentRoom({ ...data.room, password });
        setMembers(data.room.members || []);
        setMessages(data.room.messages || []);
        setShowJoinRoom(false);
        showMessage(`Joined room: ${data.room.name}`);
      } else {
        showMessage(data.message, 'error');
      }
    } catch (error) {
      showMessage('Failed to join room', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoomFromForm = (e) => {
    e.preventDefault();
    if (joinRoomId.length !== 6) {
      showMessage('Room ID must be 6 characters', 'error');
      return;
    }
    joinRoom(joinRoomId.toUpperCase(), joinPassword);
  };

  const loadFiles = async (roomId = currentRoom?.id, password = currentRoom?.password) => {
    if (!roomId) return;

    try {
      const response = await fetch(`${API_BASE}/api/ftp/files/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password || '' })
      });

      const data = await response.json();

      if (data.success) {
        setFiles(data.files);
        if (data.room) {
          setCurrentRoom(prev => ({ ...prev, ...data.room }));
        }
      } else {
        showMessage(data.message, 'error');
      }
    } catch (error) {
      showMessage('Failed to load files: ' + error.message, 'error');
    }
  };

  const uploadFiles = async (selectedFiles) => {
    if (!currentRoom || selectedFiles.length === 0) return;

    setIsLoading(true);
    const formData = new FormData();
    
    for (let file of selectedFiles) {
      formData.append('files', file);
    }
    formData.append('password', currentRoom.password || '');

    try {
      const response = await fetch(`${API_BASE}/api/ftp/upload/${currentRoom.id}`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        showMessage(data.message);
        loadFiles();
      } else {
        showMessage(data.message, 'error');
      }
    } catch (error) {
      showMessage('Upload failed: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFile = async (fileId, fileName) => {
    try {
      const response = await fetch(`${API_BASE}/api/ftp/download/${currentRoom.id}/${fileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: currentRoom.password || '' })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
        showMessage(`Downloading ${fileName}`);
      } else {
        const data = await response.json();
        showMessage(data.message, 'error');
      }
    } catch (error) {
      showMessage('Download failed: ' + error.message, 'error');
    }
  };

  const deleteFile = async (fileId, fileName) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/ftp/delete/${currentRoom.id}/${fileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: currentRoom.password || '' })
      });

      const data = await response.json();

      if (data.success) {
        showMessage(`File "${fileName}" deleted successfully`);
        loadFiles();
      } else {
        showMessage(data.message, 'error');
      }
    } catch (error) {
      showMessage('Delete failed: ' + error.message, 'error');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (e) => {
    uploadFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    uploadFiles(Array.from(e.dataTransfer.files));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const leaveRoom = () => {
    setCurrentRoom(null);
    setFiles([]);
    loadServerStatus();
  };

  if (currentRoom) {
    return (
      <div className="ftp-room">
        <div className="room-header">
          <div className="room-info">
            <h2>
              <HardDrive className="w-6 h-6" />
              {currentRoom.name}
            </h2>
            <div className="room-meta">
              <span>ID: <code>{currentRoom.id}</code></span>
              <span>{members.length} members online</span>
              <span className="refresh-tag"><Clock className="w-3 h-3" /> Auto-sync active (1s)</span>
            </div>
          </div>
          <div className="room-actions">
            <button className="btn btn-secondary" onClick={leaveRoom}>Leave Room</button>
          </div>
        </div>

        <div className="members-list">
          {members.map(m => (
            <span key={m.userId} className={`member-badge ${m.userId === userId ? 'me' : ''}`}>
              {m.userName} {m.userId === userId && '(You)'}
            </span>
          ))}
        </div>

        <div className="sharing-grid">
          <div className="files-column">
            <h3>Files</h3>
            <div className="upload-area" onClick={() => document.getElementById('fileInput').click()}>
              <Upload className="w-8 h-8" />
              <p>Click to Upload</p>
              <input id="fileInput" type="file" multiple onChange={(e) => uploadFiles(Array.from(e.target.files))} style={{ display: 'none' }} />
            </div>

            <div className="files-list">
              {files.length === 0 ? <p className="no-data">No files shared yet</p> : 
                files.map(f => (
                  <div key={f.id} className="file-item">
                    <div className="file-details">
                      <span className="name">{f.name}</span>
                      <span className="size">{(f.size/1024/1024).toFixed(2)} MB</span>
                    </div>
                    <button className="btn btn-sm btn-primary" onClick={() => downloadFile(f.id, f.name)}>
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))
              }
            </div>
          </div>

          <div className="chat-column">
            <h3>Text Share / Chat</h3>
            <div className="chat-box" id="chatBox">
              {messages.length === 0 ? <p className="no-data">No messages yet</p> :
                messages.map(m => (
                  <div key={m.id} className={`chat-msg ${m.userId === userId ? 'mine' : ''}`}>
                    <small>{m.userName}</small>
                    <p>{m.text}</p>
                  </div>
                ))
              }
            </div>
            <form onSubmit={sendMessage} className="chat-input-area">
              <input type="text" value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Type or paste text here..." />
              <button type="submit" className="btn btn-primary">Send</button>
            </form>
          </div>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <style jsx>{`
          .ftp-room { padding: 1.5rem; max-width: 1000px; margin: 0 auto; color: white; }
          .room-header { display: flex; justify-content: space-between; margin-bottom: 1.5rem; }
          .room-meta { display: flex; gap: 1rem; font-size: 0.85rem; color: #94a3b8; margin-top: 0.5rem; }
          .refresh-tag { color: #22c55e; display: flex; align-items: center; gap: 0.25rem; }

          .members-list { display: flex; gap: 0.5rem; margin-bottom: 2rem; flex-wrap: wrap; }
          .member-badge { background: #334155; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; }
          .member-badge.me { background: #1e40af; border: 1px solid #3b82f6; }

          .sharing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }

          .upload-area { border: 2px dashed #334155; border-radius: 12px; padding: 1.5rem; text-align: center; cursor: pointer; margin: 1rem 0; }
          .upload-area:hover { background: rgba(59, 130, 246, 0.1); border-color: #3b82f6; }

          .files-list { max-height: 400px; overflow-y: auto; }
          .file-item { background: #1e293b; padding: 0.75rem 1rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
          .file-details { display: flex; flex-direction: column; }
          .file-details .name { font-weight: 500; font-size: 0.9rem; }
          .file-details .size { font-size: 0.75rem; color: #94a3b8; }

          .chat-column { display: flex; flex-direction: column; }
          .chat-box { height: 350px; background: #0f172a; border-radius: 12px; padding: 1rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem; border: 1px solid #334155; }
          .chat-msg { background: #334155; padding: 0.5rem 1rem; border-radius: 12px; align-self: flex-start; max-width: 85%; }
          .chat-msg.mine { align-self: flex-end; background: #3b82f6; }
          .chat-msg small { font-size: 0.7rem; opacity: 0.7; }
          .chat-msg p { margin-top: 0.25rem; font-size: 0.9rem; word-break: break-all; }

          .chat-input-area { display: flex; gap: 0.5rem; margin-top: 1rem; }
          .chat-input-area input { flex: 1; background: #0f172a; border: 1px solid #334155; color: white; padding: 0.75rem; border-radius: 8px; }

          .no-data { text-align: center; color: #64748b; padding: 2rem; font-style: italic; }

          .message { position: fixed; bottom: 2rem; right: 2rem; padding: 1rem; border-radius: 8px; background: #1e293b; z-index: 100; border: 1px solid #334155; }

          @media (max-width: 768px) {
            .sharing-grid { grid-template-columns: 1fr; }
          }
        `}</style>
      </div>
    );
  }
  return (
    <div className="ftp-mode">
      <div className="ftp-header">
        <div className="header-content">
          <h1>
            <Server className="w-8 h-8" />
            FTP Server Mode
          </h1>
          <p>Offline File Transfer Protocol - Share files without internet</p>
        </div>
      </div>

      <div className="ftp-actions">
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateRoom(true)}
          disabled={isLoading}
        >
          <FolderPlus className="w-5 h-5" />
          Create FTP Room
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setShowJoinRoom(true)}
          disabled={isLoading}
        >
          <Users className="w-5 h-5" />
          Join FTP Room
        </button>
        <button
          className="btn btn-secondary"
          onClick={loadServerStatus}
          disabled={isLoading}
        >
          <RefreshCw className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {rooms.length > 0 && (
        <div className="active-rooms">
          <h3>Active FTP Rooms ({rooms.length})</h3>
          <div className="rooms-grid">
            {rooms.map((room) => (
              <div key={room.id} className="room-card">
                <div className="room-info">
                  <h4>{room.name}</h4>
                  <div className="room-meta">
                    <span>ID: <code>{room.id}</code></span>
                    <span>{room.fileCount} files</span>
                    {room.hasPassword && (
                      <span className="protected">
                        <Key className="w-3 h-3" />
                        Protected
                      </span>
                    )}
                    <span className="timestamp">
                      <Clock className="w-3 h-3" />
                      {new Date(room.lastAccess).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    const password = room.hasPassword ? 
                      prompt('Enter room password:') || '' : '';
                    joinRoom(room.id, password);
                  }}
                >
                  Join Room
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateRoom && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create FTP Room</h2>
              <p>Create a new room for offline file sharing</p>
            </div>
            <form onSubmit={createRoom}>
              <div className="form-group">
                <label>Room Name (Optional)</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Enter room name"
                />
              </div>
              <div className="form-group">
                <label>Password (Optional)</label>
                <input
                  type="password"
                  value={newRoomPassword}
                  onChange={(e) => setNewRoomPassword(e.target.value)}
                  placeholder="Enter password for protection"
                />
              </div>
              <div className="button-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateRoom(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {showJoinRoom && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Join FTP Room</h2>
              <p>Enter room ID and password to join</p>
            </div>
            <form onSubmit={joinRoomFromForm}>
              <div className="form-group">
                <label>Room ID</label>
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character room ID"
                  maxLength="6"
                  className="room-id-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password (if required)</label>
                <input
                  type="password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  placeholder="Enter room password"
                />
              </div>
              <div className="button-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowJoinRoom(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isLoading || joinRoomId.length !== 6}
                >
                  {isLoading ? 'Joining...' : 'Join Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {message && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      <style jsx>{`
        .ftp-mode {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .ftp-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .header-content h1 {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          color: white;
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .header-content p {
          color: rgba(255, 255, 255, 0.8);
          font-size: 1.2rem;
        }

        .ftp-actions {
          display: flex;
          gap: 1rem;
          margin-bottom: 3rem;
          flex-wrap: wrap;
        }

        .active-rooms h3 {
          color: white;
          margin-bottom: 1rem;
        }

        .rooms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1rem;
        }

        .room-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .room-info h4 {
          color: white;
          margin-bottom: 0.5rem;
        }

        .room-meta {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
        }

        .room-meta code {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-family: monospace;
        }

        .protected {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #22c55e;
        }

        .timestamp {
          display: flex;
          align-items: center;
          gap: 0.25rem;
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
        }

        .modal-header p {
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
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
          text-align: center;
          letter-spacing: 0.1em;
        }

        .button-group {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .button-group button {
          flex: 1;
        }

        .message {
          position: fixed;
          top: 2rem;
          right: 2rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 8px;
          padding: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          z-index: 1000;
          max-width: 400px;
        }

        .message.success {
          border-color: rgba(34, 197, 94, 0.3);
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
        }

        .message.error {
          border-color: rgba(220, 38, 38, 0.3);
          background: rgba(220, 38, 38, 0.1);
          color: #ef4444;
        }

        @media (max-width: 768px) {
          .ftp-mode {
            padding: 1rem;
          }

          .ftp-actions {
            flex-direction: column;
          }

          .rooms-grid {
            grid-template-columns: 1fr;
          }

          .room-card {
            flex-direction: column;
            gap: 1rem;
          }

          .message {
            top: 1rem;
            right: 1rem;
            left: 1rem;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
};

export default FTPMode;

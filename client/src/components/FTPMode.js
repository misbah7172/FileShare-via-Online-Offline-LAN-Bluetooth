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

  // Determine API base URL - use network IP if available, fallback to localhost
  const getAPIBase = () => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3003';
    }
    return `http://${hostname}:3003`;
  };
  
  const API_BASE = process.env.REACT_APP_FTP_SERVER_URL || getAPIBase();

  const showMessage = useCallback((text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  const loadServerStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ftp/status`);
      const data = await response.json();
      
      if (data.success) {
        setRooms(data.rooms);
      }
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
        
        // Auto-join the created room
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

  const joinRoom = async (roomId, password = '') => {
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/ftp/join/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentRoom({
          ...data.room,
          password
        });
        setShowJoinRoom(false);
        setJoinRoomId('');
        setJoinPassword('');
        showMessage(`Joined room: ${data.room.name}`);
        loadFiles(roomId, password);
      } else {
        showMessage(data.message, 'error');
      }
    } catch (error) {
      showMessage('Failed to join room: ' + error.message, 'error');
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
              FTP Room: {currentRoom.name}
            </h2>
            <div className="room-meta">
              <span>Room ID: <code>{currentRoom.id}</code></span>
              <span>Files: {files.length}</span>
              {currentRoom.hasPassword && (
                <span className="protected">
                  <Key className="w-4 h-4" />
                  Protected
                </span>
              )}
            </div>
          </div>
          <div className="room-actions">
            <button className="btn btn-secondary" onClick={() => loadFiles()}>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="btn btn-secondary" onClick={leaveRoom}>
              Leave Room
            </button>
          </div>
        </div>

        <div className="upload-section">
          <div
            className="upload-area"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById('fileInput').click()}
          >
            <Upload className="w-12 h-12" />
            <h3>Drop files here or click to upload</h3>
            <p>Supports multiple files up to 100MB each</p>
            <input
              id="fileInput"
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        <div className="files-section">
          <h3>Files in Room ({files.length})</h3>
          {files.length === 0 ? (
            <div className="no-files">
              <FileText className="w-12 h-12" />
              <p>No files uploaded yet</p>
            </div>
          ) : (
            <div className="files-grid">
              {files.map((file) => (
                <div key={file.id} className="file-card">
                  <div className="file-info">
                    <h4>{file.name}</h4>
                    <div className="file-meta">
                      <span>{formatFileSize(file.size)}</span>
                      <span>{file.type}</span>
                      <span className="timestamp">
                        <Clock className="w-3 h-3" />
                        {new Date(file.uploadedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="file-actions">
                    <button
                      className="btn btn-sm"
                      onClick={() => downloadFile(file.id, file.name)}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => deleteFile(file.id, file.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
          .ftp-room {
            padding: 2rem;
            max-width: 1200px;
            margin: 0 auto;
          }

          .room-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2rem;
            flex-wrap: wrap;
            gap: 1rem;
          }

          .room-info h2 {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: white;
            margin-bottom: 0.5rem;
          }

          .room-meta {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
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

          .room-actions {
            display: flex;
            gap: 1rem;
          }

          .upload-section {
            margin-bottom: 3rem;
          }

          .upload-area {
            border: 2px dashed rgba(255, 255, 255, 0.3);
            border-radius: 12px;
            padding: 3rem;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
          }

          .upload-area:hover {
            border-color: #22c55e;
            background: rgba(34, 197, 94, 0.1);
          }

          .upload-area h3 {
            color: white;
            margin: 1rem 0 0.5rem 0;
          }

          .upload-area p {
            color: rgba(255, 255, 255, 0.7);
            margin: 0;
          }

          .files-section h3 {
            color: white;
            margin-bottom: 1rem;
          }

          .no-files {
            text-align: center;
            padding: 3rem;
            color: rgba(255, 255, 255, 0.7);
          }

          .files-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 1rem;
          }

          .file-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 1.5rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .file-info h4 {
            color: white;
            margin-bottom: 0.5rem;
            word-break: break-word;
          }

          .file-meta {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
            margin-bottom: 1rem;
          }

          .timestamp {
            display: flex;
            align-items: center;
            gap: 0.25rem;
          }

          .file-actions {
            display: flex;
            gap: 0.5rem;
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
            .ftp-room {
              padding: 1rem;
            }

            .room-header {
              flex-direction: column;
            }

            .files-grid {
              grid-template-columns: 1fr;
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

import React from 'react';
import { Users, Star, Edit3, Wifi, WifiOff } from 'lucide-react';

const UserList = ({ users, connectedPeers, currentUser, onEditName }) => {
  const getUserStatus = (user) => {
    if (user.isCurrentUser) return 'current';
    return connectedPeers.has(user.userId) ? 'connected' : 'disconnected';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'current':
        return <Star size={14} className="status-icon status-current" />;
      case 'connected':
        return <Wifi size={14} className="status-icon status-connected" />;
      case 'disconnected':
        return <WifiOff size={14} className="status-icon status-disconnected" />;
      default:
        return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'current':
        return 'You';
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Connecting...';
      default:
        return '';
    }
  };

  return (
    <div className="user-list-container">
      <div className="user-list-header">
        <div className="header-info">
          <Users size={18} />
          <h3>Users ({users.length})</h3>
        </div>
      </div>
      
      <div className="user-list">
        {users.map((user) => {
          const status = getUserStatus(user);
          return (
            <div key={user.userId} className={`user-item ${status}`}>
              <div className="user-info">
                <div className="user-name-container">
                  <span className="user-name" title={user.userName}>
                    {user.userName}
                  </span>
                  {user.isCurrentUser && (
                    <button
                      className="edit-name-btn"
                      onClick={onEditName}
                      title="Edit your name"
                    >
                      <Edit3 size={12} />
                    </button>
                  )}
                </div>
                <div className="user-status">
                  {getStatusIcon(status)}
                  <span className="status-text">
                    {getStatusText(status)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <style jsx>{`
        .user-list-container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .user-list-header {
          margin-bottom: 1rem;
        }
        
        .header-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: white;
        }
        
        .header-info h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
        }
        
        .user-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .user-item {
          padding: 0.75rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.2s ease-in-out;
        }
        
        .user-item.current {
          background: rgba(102, 126, 234, 0.2);
          border-color: rgba(102, 126, 234, 0.3);
        }
        
        .user-item.connected {
          background: rgba(40, 167, 69, 0.1);
          border-color: rgba(40, 167, 69, 0.2);
        }
        
        .user-item.disconnected {
          background: rgba(255, 193, 7, 0.1);
          border-color: rgba(255, 193, 7, 0.2);
        }
        
        .user-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .user-name-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .user-name {
          color: white;
          font-weight: 500;
          font-size: 0.9rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        
        .edit-name-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          transition: all 0.2s ease-in-out;
          flex-shrink: 0;
        }
        
        .edit-name-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.1);
        }
        
        .user-status {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.8rem;
        }
        
        .status-text {
          color: rgba(255, 255, 255, 0.8);
        }
        
        .status-icon {
          flex-shrink: 0;
        }
        
        .status-current {
          color: #667eea;
        }
        
        .status-connected {
          color: #28a745;
        }
        
        .status-disconnected {
          color: #ffc107;
        }
        
        @media (max-width: 768px) {
          .user-list-container {
            padding: 1rem;
          }
          
          .user-item {
            padding: 0.5rem;
          }
          
          .user-name {
            font-size: 0.85rem;
          }
          
          .user-status {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default UserList;

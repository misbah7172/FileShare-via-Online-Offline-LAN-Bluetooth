import React from 'react';
import { 
  Download, 
  X, 
  Check, 
  AlertCircle, 
  Clock, 
  Upload, 
  FileText,
  Loader
} from 'lucide-react';
import { formatFileSize, getFileIcon, downloadFile } from '../services/utils';

const FileTransfer = ({ transfers, onAccept, onReject, onRemove, users }) => {
  const getUserName = (userId) => {
    const user = users.find(u => u.userId === userId);
    return user?.userName || 'Unknown User';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'offered':
        return <Clock size={16} className="status-icon status-offered" />;
      case 'transferring':
        return <Loader size={16} className="status-icon status-transferring spin" />;
      case 'completed':
        return <Check size={16} className="status-icon status-completed" />;
      case 'error':
        return <AlertCircle size={16} className="status-icon status-error" />;
      default:
        return <FileText size={16} className="status-icon" />;
    }
  };

  const getStatusText = (transfer) => {
    switch (transfer.status) {
      case 'offered':
        return 'Awaiting response';
      case 'preparing':
        return 'Preparing...';
      case 'transferring':
        return transfer.progress ? `${transfer.progress}%` : 'Transferring...';
      case 'completed':
        return 'Completed';
      case 'error':
        return `Error: ${transfer.error || 'Unknown error'}`;
      default:
        return transfer.status;
    }
  };

  const handleDownload = (transfer) => {
    if (transfer.blob && transfer.fileName) {
      downloadFile(transfer.blob, transfer.fileName);
    }
  };

  if (transfers.length === 0) {
    return (
      <div className="file-transfer-container">
        <div className="empty-state">
          <Upload size={48} className="empty-icon" />
          <h3>No file transfers yet</h3>
          <p>Files you send and receive will appear here</p>
        </div>
        
        <style jsx>{`
          .file-transfer-container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            min-height: 300px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .empty-state {
            text-align: center;
            color: rgba(255, 255, 255, 0.6);
          }
          
          .empty-icon {
            margin-bottom: 1rem;
            opacity: 0.5;
          }
          
          .empty-state h3 {
            margin: 0 0 0.5rem 0;
            font-size: 1.1rem;
          }
          
          .empty-state p {
            margin: 0;
            font-size: 0.9rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="file-transfer-container">
      <h3 className="transfers-title">File Transfers</h3>
      
      <div className="transfers-list">
        {transfers.map((transfer) => (
          <div key={transfer.id} className="transfer-item">
            <div className="transfer-header">
              <div className="file-info">
                <span className="file-icon">
                  {getFileIcon(transfer.fileType)}
                </span>
                <div className="file-details">
                  <span className="file-name" title={transfer.fileName}>
                    {transfer.fileName}
                  </span>
                  <div className="file-meta">
                    <span className="file-size">
                      {formatFileSize(transfer.fileSize)}
                    </span>
                    {transfer.fromUserId && (
                      <span className="file-source">
                        from {getUserName(transfer.fromUserId)}
                      </span>
                    )}
                    {transfer.isRemote && (
                      <span className="remote-badge">Available on {getUserName(transfer.remoteUserId)}</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="transfer-actions">
                {transfer.direction === 'incoming' && transfer.status === 'offered' && (
                  <>
                    <button
                      className="btn btn-success btn-small"
                      onClick={() => onAccept(transfer.id)}
                      title="Accept file"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => onReject(transfer.id)}
                      title="Reject file"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
                
                {transfer.status === 'completed' && transfer.blob && (
                  <button
                    className="btn btn-primary btn-small"
                    onClick={() => handleDownload(transfer)}
                    title="Download file"
                  >
                    <Download size={14} />
                  </button>
                )}
                
                {(transfer.status === 'completed' || transfer.status === 'error') && (
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => onRemove(transfer.id)}
                    title="Remove from list"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            
            <div className="transfer-status">
              <div className="status-info">
                {getStatusIcon(transfer.status)}
                <span className="status-text">
                  {getStatusText(transfer)}
                </span>
                {transfer.direction === 'incoming' && transfer.fromUserId && (
                  <span className="from-user">
                    from {getUserName(transfer.fromUserId)}
                  </span>
                )}
                {transfer.direction === 'outgoing' && (
                  <span className="to-user">
                    to {transfer.targetUsers?.length || 0} user(s)
                  </span>
                )}
              </div>
              
              {transfer.status === 'transferring' && transfer.progress !== undefined && (
                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${transfer.progress}%` }}
                    />
                  </div>
                  <span className="progress-text">{transfer.progress}%</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <style jsx>{`
        .file-transfer-container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          min-height: 300px;
          max-height: 500px;
          overflow-y: auto;
        }
        
        .transfers-title {
          color: white;
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
          font-weight: 600;
        }
        
        .transfers-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .transfer-item {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .transfer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        
        .file-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
          min-width: 0;
        }
        
        .file-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        
        .file-details {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }
        
        .file-name {
          color: white;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 0.9rem;
        }
        
        .file-meta {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-wrap: wrap;
        }
        
        .file-size {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.8rem;
        }
        
        .file-source {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.8rem;
        }
        
        .remote-badge {
          background: rgba(59, 130, 246, 0.3);
          color: #60a5fa;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.7rem;
          border: 1px solid rgba(59, 130, 246, 0.5);
        }
        
        .transfer-actions {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        
        .transfer-status {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .status-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
        }
        
        .status-text {
          color: white;
          font-weight: 500;
        }
        
        .from-user,
        .to-user {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.8rem;
        }
        
        .status-icon {
          flex-shrink: 0;
        }
        
        .status-offered {
          color: #ffc107;
        }
        
        .status-transferring {
          color: #17a2b8;
        }
        
        .status-completed {
          color: #28a745;
        }
        
        .status-error {
          color: #dc3545;
        }
        
        .progress-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .progress-bar {
          flex: 1;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          overflow: hidden;
        }
        
        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          transition: width 0.3s ease-in-out;
          border-radius: 3px;
        }
        
        .progress-text {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.8rem;
          font-weight: 500;
          min-width: 40px;
          text-align: right;
        }
        
        @media (max-width: 768px) {
          .transfer-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          
          .transfer-actions {
            align-self: flex-end;
          }
          
          .file-name {
            font-size: 0.85rem;
          }
          
          .status-info {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
};

export default FileTransfer;

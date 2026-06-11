import React from 'react';
import { Zap, AlertCircle, CheckCircle, Loader, RefreshCw } from 'lucide-react';

const ConnectionStatus = ({ status, connectedPeers, totalPeers, peerStates = {}, peerIceStates = {}, onRestartAll }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'connected':
        if (totalPeers === 0) {
          return {
            icon: <Zap size={18} className="status-icon status-waiting" />,
            text: 'Room ready - waiting for others',
            subtext: 'Share the room link to invite users',
            className: 'status-waiting'
          };
        } else if (connectedPeers === totalPeers) {
          return {
            icon: <CheckCircle size={18} className="status-icon status-connected" />,
            text: '⚡ All peers connected!',
            subtext: `${connectedPeers} of ${totalPeers} users connected`,
            className: 'status-connected'
          };
        } else {
          // Check if any peer is stuck in a specific state
          const stuckPeers = Object.entries(peerIceStates).filter(([_, state]) => 
            ['checking', 'disconnected', 'failed'].includes(state)
          );
          
          let text = 'Connecting to peers...';
          let subtext = `${connectedPeers} of ${totalPeers} users connected`;
          let showTroubleshooting = totalPeers > 0 && connectedPeers < totalPeers;

          if (stuckPeers.length > 0) {
            text = 'Some connections are stuck';
            subtext = `Stuck in state: ${stuckPeers[0][1]}. Try restarting or check firewall.`;
          }

          return {
            icon: <Loader size={18} className="status-icon status-connecting spin" />,
            text,
            subtext,
            className: 'status-connecting',
            showTroubleshooting
          };
        }
      case 'connecting':
        return {
          icon: <Loader size={18} className="status-icon status-connecting spin" />,
          text: 'Connecting to signaling server...',
          subtext: 'Please wait',
          className: 'status-connecting'
        };
      case 'error':
        return {
          icon: <AlertCircle size={18} className="status-icon status-error" />,
          text: 'Connection failed',
          subtext: 'Please check your internet connection',
          className: 'status-error'
        };
      default:
        return {
          icon: <Loader size={18} className="status-icon status-connecting spin" />,
          text: 'Initializing...',
          subtext: 'Setting up connection',
          className: 'status-connecting'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`connection-status ${statusInfo.className}`}>
      <div className="status-content">
        <div className="status-header">
          {statusInfo.icon}
          <span className="status-text">{statusInfo.text}</span>
        </div>
        <p className="status-subtext">{statusInfo.subtext}</p>
        
        {statusInfo.showTroubleshooting && (
          <div className="troubleshooting">
            <p className="trouble-hint">Stuck? Check these:</p>
            <ul>
              <li>Both devices must be on the same WiFi</li>
              <li>Disable "AP Isolation" on your router</li>
              <li>Allow browser through Windows Firewall</li>
              <li>Try using Chrome or Edge</li>
            </ul>
            {onRestartAll && (
              <button className="btn btn-xs btn-secondary mt-2" onClick={onRestartAll}>
                <RefreshCw size={12} className="mr-1" />
                Retry Connections
              </button>
            )}
          </div>
        )}
      </div>
      
      <style jsx>{`
        .connection-status {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease-in-out;
        }
        
        .troubleshooting {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .trouble-hint {
          font-size: 0.8rem;
          font-weight: 600;
          color: #ffc107;
          margin-bottom: 0.5rem;
        }
        
        .troubleshooting ul {
          margin: 0;
          padding-left: 1.25rem;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.7);
        }
        
        .troubleshooting li {
          margin-bottom: 0.25rem;
        }

        .btn-xs {
          padding: 0.2rem 0.5rem;
          font-size: 0.7rem;
        }

        .mr-1 { margin-right: 0.25rem; }
        .mt-2 { margin-top: 0.5rem; }

        .connection-status.status-connected {
          background: rgba(40, 167, 69, 0.15);
          border-color: rgba(40, 167, 69, 0.3);
        }
        
        .connection-status.status-connecting {
          background: rgba(255, 193, 7, 0.15);
          border-color: rgba(255, 193, 7, 0.3);
        }
        
        .connection-status.status-waiting {
          background: rgba(102, 126, 234, 0.15);
          border-color: rgba(102, 126, 234, 0.3);
        }
        
        .connection-status.status-error {
          background: rgba(220, 53, 69, 0.15);
          border-color: rgba(220, 53, 69, 0.3);
        }
        
        .status-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .status-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .status-text {
          color: white;
          font-weight: 600;
          font-size: 1rem;
        }
        
        .status-subtext {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.85rem;
          margin: 0;
          line-height: 1.4;
        }
        
        .status-icon {
          flex-shrink: 0;
        }
        
        .status-connected {
          color: #28a745;
        }
        
        .status-connecting {
          color: #ffc107;
        }
        
        .status-waiting {
          color: #667eea;
        }
        
        .status-error {
          color: #dc3545;
        }
        
        @media (max-width: 768px) {
          .connection-status {
            padding: 1rem;
          }
          
          .status-text {
            font-size: 0.9rem;
          }
          
          .status-subtext {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ConnectionStatus;

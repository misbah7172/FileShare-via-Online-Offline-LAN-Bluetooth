import React from 'react';
import { Share2, Shield, Wifi, Router, Server } from 'lucide-react';

const Header = ({ onToggleLAN, onToggleFTP, isLANMode, isFTPMode }) => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <Share2 size={32} className="logo-icon" />
          <h1 className="logo-text">FileShare</h1>
        </div>
        <p className="tagline">Send files from one device to many in real-time</p>
        
        <div className="header-actions">
          <button 
            className={`mode-toggle ${isLANMode ? 'active' : ''}`}
            onClick={onToggleLAN}
            title={isLANMode ? 'Switch to Internet Mode' : 'Switch to LAN Mode'}
          >
            {isLANMode ? <Router size={18} /> : <Wifi size={18} />}
            <span>{isLANMode ? 'LAN Mode' : 'Internet'}</span>
          </button>
          <button 
            className={`mode-toggle ${isFTPMode ? 'active' : ''}`}
            onClick={onToggleFTP}
            title={isFTPMode ? 'Switch to Internet Mode' : 'Switch to FTP Mode'}
          >
            <Server size={18} />
            <span>{isFTPMode ? 'FTP Mode' : 'FTP Server'}</span>
          </button>
        </div>
      </div>
      <style jsx>{`
        .header {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          padding: 1rem 2rem;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .logo-icon {
          color: #667eea;
        }

        .logo-text {
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
          margin: 0;
        }

        .tagline {
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
          font-size: 0.9rem;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .mode-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mode-toggle:hover {
          background: rgba(255, 255, 255, 0.15);
          color: white;
          border-color: rgba(255, 255, 255, 0.3);
        }

        .mode-toggle.active {
          background: rgba(102, 126, 234, 0.3);
          border-color: rgba(102, 126, 234, 0.5);
          color: #667eea;
        }

        .mode-toggle.active:hover {
          background: rgba(102, 126, 234, 0.4);
        }

        @media (max-width: 768px) {
          .header {
            padding: 1rem;
          }

          .header-content {
            flex-direction: column;
            text-align: center;
            gap: 0.5rem;
          }

          .tagline {
            font-size: 0.8rem;
          }

          .mode-toggle {
            font-size: 0.8rem;
            padding: 0.4rem 0.8rem;
          }
        }
          font-size: 1rem;
          margin: 0;
          font-weight: 400;
        }

        @media (max-width: 768px) {
          .header {
            padding: 1rem;
          }
          
          .header-content {
            flex-direction: column;
            text-align: center;
          }
          
          .logo-text {
            font-size: 1.5rem;
          }
          
          .tagline {
            font-size: 0.9rem;
          }
        }

        @media (prefers-color-scheme: dark) {
          .header {
            background: rgba(30, 30, 30, 0.9);
          }
        }
      `}</style>
    </header>
  );
};

export default Header;

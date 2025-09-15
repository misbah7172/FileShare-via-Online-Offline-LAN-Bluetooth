import React from 'react';
import { Shield, Github, Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="security-notice">
          <Shield size={16} />
          <span>
            This platform uses end-to-end encryption to ensure your data is 
            protected from unauthorized access.
          </span>
        </div>
        
        <div className="footer-links">
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="footer-link"
          >
            <Github size={16} />
            Open Source
          </a>
          
          <span className="footer-divider">•</span>
          
          <span className="footer-credit">
            Made with <Heart size={14} className="heart" /> for secure file sharing
          </span>
        </div>
      </div>
      
      <style jsx>{`
        .footer {
          background: rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(10px);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1.5rem 2rem;
          margin-top: auto;
        }
        
        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: center;
          text-align: center;
        }
        
        .security-notice {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.9rem;
          max-width: 600px;
          line-height: 1.4;
        }
        
        .security-notice svg {
          color: #28a745;
          flex-shrink: 0;
        }
        
        .footer-links {
          display: flex;
          align-items: center;
          gap: 1rem;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
        }
        
        .footer-link {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          transition: color 0.2s ease-in-out;
        }
        
        .footer-link:hover {
          color: #667eea;
        }
        
        .footer-divider {
          color: rgba(255, 255, 255, 0.3);
        }
        
        .footer-credit {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        
        .heart {
          color: #e74c3c;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
        
        @media (max-width: 768px) {
          .footer {
            padding: 1rem;
          }
          
          .security-notice {
            font-size: 0.8rem;
          }
          
          .footer-links {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .footer-divider {
            display: none;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;

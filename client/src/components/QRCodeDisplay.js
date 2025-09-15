import React, { useState, useEffect } from 'react';
import { generateQRCode } from '../services/utils';

const QRCodeDisplay = ({ url }) => {
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateCode = async () => {
      setLoading(true);
      try {
        const qrDataUrl = await generateQRCode(url);
        setQrCode(qrDataUrl);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
      setLoading(false);
    };

    generateCode();
  }, [url]);

  if (loading) {
    return (
      <div className="qr-container">
        <div className="qr-loading">
          <div className="loading-spinner"></div>
          <p>Generating QR Code...</p>
        </div>
        <style jsx>{`
          .qr-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 1rem;
          }
          
          .qr-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            color: rgba(255, 255, 255, 0.8);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="qr-container">
      <div className="qr-code-wrapper">
        {qrCode && (
          <img 
            src={qrCode} 
            alt="QR Code for room link" 
            className="qr-image"
          />
        )}
      </div>
      <p className="qr-instructions">
        Scan this QR code with your mobile device to join the room
      </p>
      
      <style jsx>{`
        .qr-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .qr-code-wrapper {
          background: white;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        
        .qr-image {
          display: block;
          width: 200px;
          height: 200px;
        }
        
        .qr-instructions {
          color: rgba(255, 255, 255, 0.8);
          text-align: center;
          margin: 0;
          font-size: 0.9rem;
          max-width: 250px;
          line-height: 1.4;
        }
        
        @media (max-width: 768px) {
          .qr-image {
            width: 150px;
            height: 150px;
          }
          
          .qr-instructions {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
};

export default QRCodeDisplay;

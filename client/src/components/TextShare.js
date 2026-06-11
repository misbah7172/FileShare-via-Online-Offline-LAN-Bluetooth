import React, { useState } from 'react';
import { 
  Send, 
  Copy, 
  Check, 
  Clock, 
  User,
  MessageSquare
} from 'lucide-react';
import { copyToClipboard } from '../services/utils';

const TextShare = ({ messages, onSendMessage, users, currentUser }) => {
  const [text, setText] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const handleSend = () => {
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  const handleCopy = async (message) => {
    const success = await copyToClipboard(message.text);
    if (success) {
      setCopiedId(message.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.userId === userId);
    return user?.userName || 'Unknown User';
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="text-share-container">
      <h3 className="share-title">Text Sharing</h3>
      
      <div className="messages-list">
        {messages.length === 0 ? (
          <div className="empty-messages">
            <MessageSquare size={48} className="empty-icon" />
            <p>No shared text yet</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`message-item ${msg.fromUserId === currentUser?.userId ? 'message-own' : ''}`}
            >
              <div className="message-header">
                <span className="message-user">
                  <User size={12} />
                  {getUserName(msg.fromUserId)}
                </span>
                <span className="message-time">
                  <Clock size={12} />
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <div className="message-content">
                <p className="message-text">{msg.text}</p>
                <button 
                  className="btn-copy" 
                  onClick={() => handleCopy(msg)}
                  title="Copy to clipboard"
                >
                  {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="message-input-area">
        <textarea
          className="message-input"
          placeholder="Type or paste text to share..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button 
          className="btn btn-primary btn-send"
          onClick={handleSend}
          disabled={!text.trim()}
        >
          <Send size={18} />
        </button>
      </div>

      <style jsx>{`
        .text-share-container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          flex-direction: column;
          height: 500px;
        }
        
        .share-title {
          color: white;
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
          font-weight: 600;
        }
        
        .messages-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1rem;
          padding-right: 0.5rem;
        }
        
        .empty-messages {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: rgba(255, 255, 255, 0.5);
        }
        
        .empty-icon {
          margin-bottom: 1rem;
          opacity: 0.3;
        }
        
        .message-item {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          max-width: 90%;
          align-self: flex-start;
        }
        
        .message-own {
          align-self: flex-end;
          background: rgba(102, 126, 234, 0.2);
          border-color: rgba(102, 126, 234, 0.3);
        }
        
        .message-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
          gap: 1rem;
        }
        
        .message-user, .message-time {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        
        .message-content {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
        }
        
        .message-text {
          margin: 0;
          color: white;
          font-size: 0.9rem;
          white-space: pre-wrap;
          word-break: break-word;
          flex: 1;
        }
        
        .btn-copy {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 4px;
          color: white;
          padding: 0.25rem;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .btn-copy:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .message-input-area {
          display: flex;
          gap: 0.75rem;
          align-items: flex-end;
        }
        
        .message-input {
          flex: 1;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 0.75rem;
          color: white;
          font-size: 0.9rem;
          resize: none;
          height: 60px;
          font-family: inherit;
        }
        
        .message-input:focus {
          outline: none;
          border-color: rgba(102, 126, 234, 0.5);
          background: rgba(255, 255, 255, 0.12);
        }
        
        .btn-send {
          height: 60px;
          width: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};

export default TextShare;

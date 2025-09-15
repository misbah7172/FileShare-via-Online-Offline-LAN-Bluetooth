import { io } from 'socket.io-client';

let socket = null;

export const initializeSocket = () => {
  if (!socket) {
    // Auto-detect server URL based on current host
    const currentHost = window.location.hostname;
    const serverUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : `http://${currentHost}:3001`;
    
    console.log('🔌 Initializing socket connection to:', serverUrl);
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🏠 Current host:', currentHost);
    
    socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('✅ Connected to signaling server');
      console.log('📡 Socket ID:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from signaling server:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('🚫 Connection error:', error);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
    });

    socket.on('reconnect_error', (error) => {
      console.error('🔄❌ Reconnection error:', error);
    });
  }
  
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

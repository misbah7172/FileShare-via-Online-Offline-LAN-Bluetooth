import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import Home from './components/Home';
import Room from './components/Room';
import LANMode from './components/LANMode';
import FTPMode from './components/FTPMode';
import Footer from './components/Footer';
import { initializeSocket } from './services/socket';

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [roomData, setRoomData] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isLANMode, setIsLANMode] = useState(false);
  const [isFTPMode, setIsFTPMode] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    console.log('🚀 Initializing app and socket connection...');
    const socketInstance = initializeSocket();
    setSocket(socketInstance);

    // Check if user is trying to join a room from URL
    const path = window.location.pathname;
    const roomMatch = path.match(/^\/room\/([A-F0-9]{6})$/);
    
    if (roomMatch) {
      const roomId = roomMatch[1];
      setCurrentView('join');
      setRoomData({ roomId, isJoining: true });
    }

    return () => {
      console.log('🧹 App cleanup - disconnecting socket');
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  const handleRoomCreated = (data) => {
    setRoomData(data);
    setCurrentView('room');
    // Update URL
    window.history.pushState({}, '', `/room/${data.roomId}`);
  };

  const handleRoomJoined = (data) => {
    setRoomData(data);
    setCurrentView('room');
    // Update URL
    window.history.pushState({}, '', `/room/${data.roomId}`);
  };

  const handleLeaveRoom = () => {
    setRoomData(null);
    setCurrentView('home');
    // Update URL
    window.history.pushState({}, '', '/');
  };

  const toggleLANMode = () => {
    setIsLANMode(!isLANMode);
    setIsFTPMode(false); // Disable FTP mode when switching to LAN
    setCurrentView(isLANMode ? 'home' : 'lan');
  };

  const toggleFTPMode = () => {
    setIsFTPMode(!isFTPMode);
    setIsLANMode(false); // Disable LAN mode when switching to FTP
    setCurrentView(isFTPMode ? 'home' : 'ftp');
  };

  return (
    <div className="App">
      <Header 
        onToggleLAN={toggleLANMode} 
        onToggleFTP={toggleFTPMode}
        isLANMode={isLANMode} 
        isFTPMode={isFTPMode}
      />
      <main className="main-content">
        {(currentView === 'home' || currentView === 'join') && !isLANMode && !isFTPMode && (
          <Home
            socket={socket}
            onRoomCreated={handleRoomCreated}
            onRoomJoined={handleRoomJoined}
            initialRoomData={roomData}
          />
        )}
        {currentView === 'lan' && isLANMode && (
          <LANMode
            socket={socket}
            onRoomCreated={handleRoomCreated}
            onJoinRoom={handleRoomJoined}
          />
        )}
        {currentView === 'ftp' && isFTPMode && (
          <FTPMode />
        )}
        {currentView === 'room' && (
          <Room
            socket={socket}
            roomData={roomData}
            onLeaveRoom={handleLeaveRoom}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;

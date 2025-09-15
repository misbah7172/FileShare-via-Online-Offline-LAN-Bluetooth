// WebRTC configuration
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

// File chunk size (64KB)
const CHUNK_SIZE = 64 * 1024;

class PeerConnection {
  constructor(socket, localUserId, remoteUserId, roomId) {
    this.socket = socket;
    this.localUserId = localUserId;
    this.remoteUserId = remoteUserId;
    this.roomId = roomId;
    this.pc = new RTCPeerConnection(rtcConfig);
    this.dataChannel = null;
    this.isInitiator = false;
    this.connected = false;
    this.fileTransfers = new Map(); // transferId -> transfer object
    this.queuedCandidates = []; // Queue for ICE candidates received before remote description
    
    // Determine if this peer should be "polite" based on user IDs
    this.isPolite = this.localUserId < this.remoteUserId;
    this.makingOffer = false;
    this.ignoreOffer = false;
    
    console.log(`🤝 Peer ${this.remoteUserId} - I am ${this.isPolite ? 'polite' : 'impolite'}`);
    
    this.setupPeerConnection();
  }

  setupPeerConnection() {
    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Sending ICE candidate to', this.remoteUserId);
        this.socket.emit('ice-candidate', {
          targetUserId: this.remoteUserId,
          candidate: event.candidate,
          roomId: this.roomId
        });
      } else {
        console.log('🏁 ICE gathering complete');
      }
    };

    // Handle connection state changes
    this.pc.onconnectionstatechange = () => {
      console.log(`🔄 Connection state with ${this.remoteUserId}: ${this.pc.connectionState}`);
      if (this.pc.connectionState === 'connected') {
        this.connected = true;
        this.onConnected?.();
      } else if (this.pc.connectionState === 'failed') {
        console.error(`💥 Connection failed with ${this.remoteUserId}, attempting restart`);
        this.connected = false;
        this.onDisconnected?.();
        // Attempt to restart the connection
        this.restartConnection();
      } else if (['disconnected', 'closed'].includes(this.pc.connectionState)) {
        this.connected = false;
        this.onDisconnected?.();
      }
    };

    // Handle ICE connection state changes
    this.pc.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE connection state with ${this.remoteUserId}: ${this.pc.iceConnectionState}`);
    };

    // Handle signaling state changes
    this.pc.onsignalingstatechange = () => {
      console.log(`📡 Signaling state with ${this.remoteUserId}: ${this.pc.signalingState}`);
    };

    // Handle incoming data channels
    this.pc.ondatachannel = (event) => {
      console.log('📂 Data channel received from', this.remoteUserId);
      const channel = event.channel;
      this.setupDataChannel(channel);
    };

    // Handle negotiation needed (for renegotiation)
    this.pc.onnegotiationneeded = async () => {
      try {
        console.log(`🔄 Negotiation needed with ${this.remoteUserId}`);
        if (this.pc.signalingState !== 'stable') {
          console.log('⏳ Deferring negotiation - signaling state not stable');
          return;
        }
        
        // Only create offer if we're the designated initiator
        if (this.localUserId > this.remoteUserId) {
          await this.createOffer();
        }
      } catch (error) {
        console.error('❌ Error during negotiation:', error);
      }
    };
  }

  async createOffer() {
    try {
      // Don't create offer if we're already making one or if there's an incoming offer
      if (this.makingOffer) {
        console.log(`⚠️ Already making offer to ${this.remoteUserId}, skipping`);
        return;
      }
      
      // Check signaling state - only create offer in stable state
      if (this.pc.signalingState !== 'stable') {
        console.log(`⚠️ Cannot create offer in ${this.pc.signalingState} state`);
        return;
      }
      
      this.isInitiator = true;
      this.makingOffer = true;
      
      console.log(`📞 Creating offer to ${this.remoteUserId} (I am ${this.isPolite ? 'polite' : 'impolite'})`);
      
      // Create data channel for file transfers only if we're the initiator
      if (!this.dataChannel) {
        this.dataChannel = this.pc.createDataChannel('fileTransfer', {
          ordered: true,
          maxRetransmits: 3
        });
        this.setupDataChannel(this.dataChannel);
      }

      const offer = await this.pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      });
      
      // Double-check state before setting local description
      if (this.pc.signalingState !== 'stable') {
        console.log(`⚠️ Signaling state changed to ${this.pc.signalingState}, aborting offer`);
        return;
      }
      
      await this.pc.setLocalDescription(offer);
      
      console.log(`📤 Sending offer to ${this.remoteUserId}`);
      this.socket.emit('offer', {
        targetUserId: this.remoteUserId,
        offer: offer,
        roomId: this.roomId
      });
    } catch (error) {
      console.error('❌ Error creating offer:', error);
      
      // Reset peer connection on critical errors
      if (error.name === 'InvalidStateError' || error.message.includes('m-line')) {
        console.log('🔄 Restarting connection due to signaling state error');
        setTimeout(() => this.restartConnection(), 2000);
      } else {
        this.onError?.('Failed to create offer: ' + error.message);
      }
    } finally {
      this.makingOffer = false;
    }
  }

  async handleOffer(offer) {
    try {
      console.log(`📞 Handling offer from ${this.remoteUserId} (I am ${this.isPolite ? 'polite' : 'impolite'})`);
      console.log(`🔄 Current signaling state: ${this.pc.signalingState}`);
      console.log(`🔄 Making offer: ${this.makingOffer}`);
      
      // Implement polite peer pattern
      const offerCollision = this.pc.signalingState !== 'stable' || this.makingOffer;
      
      this.ignoreOffer = !this.isPolite && offerCollision;
      if (this.ignoreOffer) {
        console.log(`🚫 Ignoring offer (impolite peer in collision)`);
        return;
      }
      
      await this.pc.setRemoteDescription(offer);
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      
      console.log('📤 Sending answer to', this.remoteUserId);
      this.socket.emit('answer', {
        targetUserId: this.remoteUserId,
        answer: answer,
        roomId: this.roomId
      });
      
      // Process any queued ICE candidates
      await this.processQueuedCandidates();
    } catch (error) {
      console.error('❌ Error handling offer:', error);
      this.onError?.('Failed to handle offer: ' + error.message);
    }
  }

  async handleAnswer(answer) {
    try {
      console.log('📞 Handling answer from', this.remoteUserId);
      console.log(`🔄 Current signaling state: ${this.pc.signalingState}`);
      
      if (this.pc.signalingState !== 'have-local-offer') {
        console.warn('⚠️ Received answer in wrong state:', this.pc.signalingState);
        return;
      }
      
      await this.pc.setRemoteDescription(answer);
      console.log('✅ Answer processed successfully');
      
      // Process any queued ICE candidates
      await this.processQueuedCandidates();
    } catch (error) {
      console.error('❌ Error handling answer:', error);
      this.onError?.('Failed to handle answer: ' + error.message);
    }
  }

  async handleIceCandidate(candidate) {
    try {
      // Only add ICE candidates if we have a remote description
      if (this.pc.remoteDescription && this.pc.remoteDescription.type) {
        console.log('🧊 Adding ICE candidate from', this.remoteUserId);
        await this.pc.addIceCandidate(candidate);
      } else {
        console.log('⏳ Queuing ICE candidate (no remote description yet)');
        // Queue the candidate for later when remote description is set
        if (!this.queuedCandidates) {
          this.queuedCandidates = [];
        }
        this.queuedCandidates.push(candidate);
      }
    } catch (error) {
      console.error('❌ Error handling ICE candidate:', error);
      // Don't throw error for ICE candidate failures, just log them
      if (!error.message.includes('InvalidStateError')) {
        this.onError?.('Failed to handle ICE candidate: ' + error.message);
      }
    }
  }

  async processQueuedCandidates() {
    if (this.queuedCandidates && this.queuedCandidates.length > 0) {
      console.log('🔄 Processing', this.queuedCandidates.length, 'queued ICE candidates');
      for (const candidate of this.queuedCandidates) {
        try {
          await this.pc.addIceCandidate(candidate);
        } catch (error) {
          console.error('❌ Error adding queued candidate:', error);
        }
      }
      this.queuedCandidates = [];
    }
  }

  setupDataChannel(channel) {
    if (!this.dataChannel) {
      this.dataChannel = channel;
    }

    channel.onopen = () => {
      console.log('✅ Data channel opened with', this.remoteUserId);
      this.connected = true;
      this.onConnected?.();
      
      // Send available files list when connected
      this.sendAvailableFilesList();
    };

    channel.onclose = () => {
      console.log('❌ Data channel closed with', this.remoteUserId);
      this.connected = false;
      this.onDisconnected?.();
    };

    channel.onerror = (error) => {
      console.error('❌ Data channel error:', error);
      this.onError?.('Data channel error');
    };

    channel.onmessage = (event) => {
      // Handle both string messages (JSON) and binary data (file chunks)
      if (typeof event.data === 'string') {
        this.handleDataChannelMessage(event.data);
      } else {
        // Binary data - this is a file chunk
        this.handleRawChunkData(event.data);
      }
    };
  }

  handleDataChannelMessage(data) {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'file-offer':
          this.handleFileOffer(message);
          break;
        case 'file-answer':
          this.handleFileAnswer(message);
          break;
        case 'file-chunk':
          this.handleFileChunk(message);
          break;
        case 'file-complete':
          this.handleFileComplete(message);
          break;
        case 'file-error':
          this.handleFileError(message);
          break;
        case 'files-list':
          this.handleFilesList(message);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing data channel message:', error);
    }
  }

  // File transfer methods
  async sendFile(file, transferId) {
    if (!this.connected || !this.dataChannel) {
      throw new Error('Peer not connected');
    }

    console.log(`📤 Sending file: ${file.name} (${file.size} bytes) to ${this.remoteUserId}`);

    const transfer = {
      id: transferId,
      file: file,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      chunks: [],
      currentChunk: 0,
      totalChunks: Math.ceil(file.size / CHUNK_SIZE),
      sent: 0,
      startTime: Date.now()
    };

    this.fileTransfers.set(transferId, transfer);

    // Send file offer
    this.sendDataChannelMessage({
      type: 'file-offer',
      transferId: transferId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      totalChunks: transfer.totalChunks
    });

    // Wait for acceptance
    return new Promise((resolve, reject) => {
      transfer.resolve = resolve;
      transfer.reject = reject;
      
      // Timeout after 15 seconds (reduced from 30)
      transfer.timeout = setTimeout(() => {
        this.fileTransfers.delete(transferId);
        reject(new Error('File transfer request timed out'));
      }, 15000);
    });
  }

  handleFileAnswer(message) {
    const { transferId, accepted } = message;
    const transfer = this.fileTransfers.get(transferId);
    
    if (!transfer) {
      console.warn('⚠️ Received file answer for unknown transfer:', transferId);
      return;
    }
    
    clearTimeout(transfer.timeout);
    
    if (accepted) {
      console.log('✅ File transfer accepted:', transferId);
      this.startFileSending(transferId);
      transfer.resolve();
    } else {
      console.log('❌ File transfer rejected:', transferId);
      this.fileTransfers.delete(transferId);
      transfer.reject(new Error('File transfer rejected'));
    }
  }

  async startFileSending(transferId) {
    const transfer = this.fileTransfers.get(transferId);
    if (!transfer) return;

    try {
      // Read file and split into chunks
      const buffer = await transfer.file.arrayBuffer();
      const chunks = [];
      
      for (let i = 0; i < buffer.byteLength; i += CHUNK_SIZE) {
        chunks.push(buffer.slice(i, i + CHUNK_SIZE));
      }
      
      transfer.chunks = chunks;
      
      // Start sending chunks
      this.sendNextChunk(transferId);
    } catch (error) {
      console.error('Error reading file:', error);
      this.sendDataChannelMessage({
        type: 'file-error',
        transferId: transferId,
        error: 'Failed to read file'
      });
    }
  }

  sendNextChunk(transferId) {
    const transfer = this.fileTransfers.get(transferId);
    if (!transfer || transfer.currentChunk >= transfer.chunks.length) return;

    // Check data channel state before sending
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.error('❌ Data channel not ready for sending');
      this.sendDataChannelMessage({
        type: 'file-error',
        transferId: transferId,
        error: 'Data channel not ready'
      });
      return;
    }

    const chunk = transfer.chunks[transfer.currentChunk];
    const chunkData = new Uint8Array(chunk);
    
    // Check buffer before sending
    const bufferedAmount = this.dataChannel.bufferedAmount;
    const maxBuffer = 16 * 1024 * 1024; // 16MB buffer limit
    
    if (bufferedAmount > maxBuffer) {
      // Wait for buffer to drain
      setTimeout(() => this.sendNextChunk(transferId), 100);
      return;
    }
    
    try {
      // Send chunk metadata first
      this.sendDataChannelMessage({
        type: 'file-chunk',
        transferId: transferId,
        chunkIndex: transfer.currentChunk,
        chunkSize: chunkData.length,
        isLast: transfer.currentChunk === transfer.chunks.length - 1
      });

      // Send chunk data
      this.dataChannel.send(chunkData);

      transfer.currentChunk++;
      transfer.sent += chunkData.length;
      
      // Update progress
      const progress = Math.round((transfer.sent / transfer.fileSize) * 100);
      this.onFileProgress?.(transferId, progress, transfer.sent, transfer.fileSize);

      // Send next chunk with appropriate delay based on buffer
      if (transfer.currentChunk < transfer.chunks.length) {
        const delay = bufferedAmount > 1024 * 1024 ? 50 : 10; // Slower if buffer is getting full
        setTimeout(() => this.sendNextChunk(transferId), delay);
      } else {
        // All chunks sent
        this.sendDataChannelMessage({
          type: 'file-complete',
          transferId: transferId
        });
        
        this.fileTransfers.delete(transferId);
        this.onFileComplete?.(transferId);
      }
    } catch (error) {
      console.error('❌ Error sending chunk:', error);
      this.sendDataChannelMessage({
        type: 'file-error',
        transferId: transferId,
        error: 'Failed to send chunk: ' + error.message
      });
    }
  }

  // Receiving file methods
  handleFileOffer(offer) {
    const { transferId, fileName, fileSize, fileType, totalChunks } = offer;
    
    console.log(`📥 Received file offer: ${fileName} (${fileSize} bytes, ${totalChunks} chunks)`);
    
    // Create transfer object for incoming file
    const transfer = {
      id: transferId,
      fileName,
      fileSize,
      fileType,
      totalChunks,
      chunks: new Array(totalChunks),
      received: 0,
      startTime: Date.now()
    };
    
    this.fileTransfers.set(transferId, transfer);
    
    // Notify the application
    this.onFileOffer?.(offer);
  }

  handleFileChunk(message) {
    const { transferId, chunkIndex, chunkSize, isLast } = message;
    let transfer = this.fileTransfers.get(transferId);
    
    if (!transfer) {
      console.warn('Received chunk for unknown transfer:', transferId);
      return;
    }

    // Store the upcoming chunk data
    transfer.expectingChunk = chunkIndex;
    transfer.expectedChunkSize = chunkSize;
    transfer.isLastChunk = isLast;
  }

  handleRawChunkData(data) {
    // Find the transfer that's expecting this chunk
    for (const [transferId, transfer] of this.fileTransfers) {
      if (transfer.expectingChunk !== undefined) {
        this.handleRawChunkDataForTransfer(data, transferId);
        break;
      }
    }
  }

  handleRawChunkDataForTransfer(data, transferId) {
    const transfer = this.fileTransfers.get(transferId);
    if (!transfer || transfer.expectingChunk === undefined) return;

    const chunkIndex = transfer.expectingChunk;
    console.log(`📦 Received chunk ${chunkIndex + 1}/${transfer.totalChunks} for ${transfer.fileName}`);

    // Store chunk
    transfer.chunks[chunkIndex] = data;
    transfer.received += data.byteLength;
    
    // Update progress
    const progress = Math.round((transfer.received / transfer.fileSize) * 100);
    this.onFileProgress?.(transferId, progress, transfer.received, transfer.fileSize);

    // Reset expectation
    delete transfer.expectingChunk;
    delete transfer.expectedChunkSize;
    
    if (transfer.isLastChunk) {
      console.log(`🏁 Received last chunk for ${transfer.fileName}, assembling file...`);
      this.assembleReceivedFile(transferId);
    }
  }

  assembleReceivedFile(transferId) {
    const transfer = this.fileTransfers.get(transferId);
    if (!transfer) return;

    try {
      console.log(`🔧 Assembling file ${transfer.fileName}...`);
      
      // Check if we have all chunks
      const missingChunks = [];
      for (let i = 0; i < transfer.totalChunks; i++) {
        if (!transfer.chunks[i]) {
          missingChunks.push(i);
        }
      }
      
      if (missingChunks.length > 0) {
        console.warn(`⚠️ Missing chunks: ${missingChunks.join(', ')}`);
        this.onFileError?.(transferId, `Missing ${missingChunks.length} chunks`);
        return;
      }
      
      // Combine all chunks
      const blob = new Blob(transfer.chunks, { type: transfer.fileType });
      
      if (blob.size !== transfer.fileSize) {
        console.warn(`⚠️ File size mismatch: expected ${transfer.fileSize}, got ${blob.size}`);
      }
      
      console.log(`✅ File assembled successfully: ${transfer.fileName} (${blob.size} bytes)`);
      this.onFileReceived?.(transferId, blob, transfer.fileName);
      this.fileTransfers.delete(transferId);
    } catch (error) {
      console.error('❌ Error assembling file:', error);
      this.onFileError?.(transferId, 'Failed to assemble file: ' + error.message);
    }
  }

  handleFileComplete(message) {
    const { transferId } = message;
    this.assembleReceivedFile(transferId);
  }

  handleFileError(message) {
    const { transferId, error } = message;
    this.fileTransfers.delete(transferId);
    this.onFileError?.(transferId, error);
  }

  acceptFileTransfer(transferId) {
    console.log('✅ Accepting file transfer:', transferId);
    
    this.sendDataChannelMessage({
      type: 'file-answer',
      transferId: transferId,
      accepted: true
    });

    // Initialize receiving transfer
    const transfer = this.fileTransfers.get(transferId);
    if (transfer) {
      transfer.chunks = new Array(transfer.totalChunks);
      transfer.received = 0;
      transfer.startTime = Date.now();
      console.log(`📁 Ready to receive ${transfer.fileName} (${transfer.totalChunks} chunks)`);
    }
  }

  rejectFileTransfer(transferId) {
    this.sendDataChannelMessage({
      type: 'file-answer',
      transferId: transferId,
      accepted: false
    });

    this.fileTransfers.delete(transferId);
  }

  sendDataChannelMessage(message) {
    try {
      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        const messageStr = JSON.stringify(message);
        this.dataChannel.send(messageStr);
        return true;
      } else {
        console.warn('⚠️ Cannot send message: data channel not open', this.dataChannel?.readyState);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending data channel message:', error);
      return false;
    }
  }

  sendAvailableFilesList() {
    if (this.onGetAvailableFiles) {
      const availableFiles = this.onGetAvailableFiles();
      this.sendDataChannelMessage({
        type: 'files-list',
        files: availableFiles
      });
    }
  }

  handleFilesList(message) {
    if (this.onRemoteFilesReceived) {
      this.onRemoteFilesReceived(this.remoteUserId, message.files);
    }
  }

  // Event handlers (to be set by the user)
  onConnected = null;
  onDisconnected = null;
  onError = null;
  onFileOffer = null;
  onFileProgress = null;
  onFileComplete = null;
  onFileReceived = null;
  onFileError = null;
  onGetAvailableFiles = null; // Function to get available files from UI
  onRemoteFilesReceived = null; // Function called when remote peer shares their files list

  close() {
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    if (this.pc) {
      this.pc.close();
    }
    this.fileTransfers.clear();
  }

  async restartConnection() {
    console.log(`🔄 Restarting connection with ${this.remoteUserId}`);
    try {
      // Close existing connection
      this.close();
      
      // Create new peer connection
      this.pc = new RTCPeerConnection(rtcConfig);
      this.dataChannel = null;
      this.connected = false;
      this.queuedCandidates = [];
      
      // Re-setup the peer connection
      this.setupPeerConnection();
      
      // Only restart if we're the designated initiator
      if (this.localUserId > this.remoteUserId) {
        setTimeout(() => {
          this.createOffer();
        }, 1000); // Small delay to avoid immediate conflicts
      }
    } catch (error) {
      console.error('❌ Error restarting connection:', error);
      this.onError?.('Failed to restart connection: ' + error.message);
    }
  }
}

export class WebRTCManager {
  constructor(socket, roomId) {
    this.socket = socket;
    this.roomId = roomId;
    this.localUserId = socket.id;
    this.peers = new Map(); // userId -> PeerConnection
    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.socket.on('offer', async (data) => {
      try {
        const { fromUserId, offer } = data;
        console.log('📞 Received offer from', fromUserId);
        const peer = this.getOrCreatePeer(fromUserId);
        await peer.handleOffer(offer);
      } catch (error) {
        console.error('❌ Error handling offer:', error);
      }
    });

    this.socket.on('answer', async (data) => {
      try {
        const { fromUserId, answer } = data;
        console.log('📞 Received answer from', fromUserId);
        const peer = this.peers.get(fromUserId);
        if (peer) {
          await peer.handleAnswer(answer);
        } else {
          console.warn('⚠️ Received answer from unknown peer:', fromUserId);
        }
      } catch (error) {
        console.error('❌ Error handling answer:', error);
      }
    });

    this.socket.on('ice-candidate', async (data) => {
      try {
        const { fromUserId, candidate } = data;
        console.log('🧊 Received ICE candidate from', fromUserId);
        const peer = this.peers.get(fromUserId);
        if (peer) {
          await peer.handleIceCandidate(candidate);
        } else {
          console.warn('⚠️ Received ICE candidate from unknown peer:', fromUserId);
        }
      } catch (error) {
        console.error('❌ Error handling ICE candidate:', error);
      }
    });

    this.socket.on('user-left', (data) => {
      try {
        const { userId } = data;
        console.log('👋 User left:', userId);
        this.removePeer(userId);
      } catch (error) {
        console.error('❌ Error handling user left:', error);
      }
    });
  }

  getOrCreatePeer(userId) {
    if (!this.peers.has(userId)) {
      const peer = new PeerConnection(this.socket, this.localUserId, userId, this.roomId);
      
      // Set up event handlers
      peer.onConnected = () => this.onPeerConnected?.(userId);
      peer.onDisconnected = () => this.onPeerDisconnected?.(userId);
      peer.onError = (error) => this.onPeerError?.(userId, error);
      peer.onFileOffer = (offer) => this.onFileOffer?.(userId, offer);
      peer.onFileProgress = (transferId, progress, sent, total) => 
        this.onFileProgress?.(userId, transferId, progress, sent, total);
      peer.onFileComplete = (transferId) => this.onFileComplete?.(userId, transferId);
      peer.onFileReceived = (transferId, blob, fileName) => 
        this.onFileReceived?.(userId, transferId, blob, fileName);
      peer.onFileError = (transferId, error) => this.onFileError?.(userId, transferId, error);
      peer.onGetAvailableFiles = () => this.onGetAvailableFiles?.();
      peer.onRemoteFilesReceived = (remoteUserId, files) => this.onRemoteFilesReceived?.(remoteUserId, files);
      
      this.peers.set(userId, peer);
    }
    
    return this.peers.get(userId);
  }

  async connectToPeer(userId) {
    console.log(`🤝 Attempting to connect to peer: ${userId}`);
    const peer = this.getOrCreatePeer(userId);
    
    // Only the "impolite" peer (higher ID) should initiate the connection
    // This prevents both peers from creating offers simultaneously
    if (this.localUserId > userId) {
      console.log(`📞 I will initiate connection to ${userId} (I have higher ID)`);
      await peer.createOffer();
    } else {
      console.log(`⏳ Waiting for ${userId} to initiate connection (they have higher ID)`);
      // The other peer will initiate, we just wait for their offer
    }
  }

  removePeer(userId) {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.close();
      this.peers.delete(userId);
      this.onPeerDisconnected?.(userId);
    }
  }

  async sendFileToUser(userId, file, transferId) {
    const peer = this.peers.get(userId);
    if (!peer || !peer.connected) {
      throw new Error('Peer not connected');
    }
    
    return await peer.sendFile(file, transferId);
  }

  async sendFileToAll(file, transferId) {
    const promises = [];
    
    for (const [userId, peer] of this.peers) {
      if (peer.connected) {
        promises.push(peer.sendFile(file, `${transferId}-${userId}`));
      }
    }
    
    return Promise.all(promises);
  }

  acceptFileTransfer(userId, transferId) {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.acceptFileTransfer(transferId);
    }
  }

  rejectFileTransfer(userId, transferId) {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.rejectFileTransfer(transferId);
    }
  }

  getConnectedPeers() {
    const connected = [];
    for (const [userId, peer] of this.peers) {
      if (peer.connected) {
        connected.push(userId);
      }
    }
    return connected;
  }

  // Event handlers (to be set by the user)
  onPeerConnected = null;
  onPeerDisconnected = null;
  onPeerError = null;
  onFileOffer = null;
  onFileProgress = null;
  onFileComplete = null;
  onFileReceived = null;
  onFileError = null;
  onGetAvailableFiles = null;
  onRemoteFilesReceived = null;

  destroy() {
    for (const peer of this.peers.values()) {
      peer.close();
    }
    this.peers.clear();
  }
}

export default WebRTCManager;

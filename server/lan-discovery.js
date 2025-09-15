const dgram = require('dgram');
const os = require('os');
const crypto = require('crypto');

class LANDiscovery {
  constructor(port = 3001) {
    this.port = port;
    this.discoveryPort = 3002; // UDP port for discovery
    this.devices = new Map(); // deviceId -> device info
    this.socket = null;
    this.broadcastInterval = null;
    this.deviceId = this.generateDeviceId();
    this.deviceInfo = this.getDeviceInfo();
  }

  generateDeviceId() {
    // Generate a unique device ID based on network interfaces
    const interfaces = os.networkInterfaces();
    const macs = [];
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
          macs.push(iface.mac);
        }
      }
    }
    
    if (macs.length > 0) {
      return crypto.createHash('md5').update(macs.join(':')).digest('hex').substring(0, 12);
    }
    
    // Fallback to random ID
    return crypto.randomBytes(6).toString('hex');
  }

  getDeviceInfo() {
    const interfaces = os.networkInterfaces();
    const ipAddresses = [];
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (!iface.internal && iface.family === 'IPv4') {
          ipAddresses.push({
            interface: name,
            address: iface.address,
            netmask: iface.netmask
          });
        }
      }
    }

    return {
      deviceId: this.deviceId,
      hostname: os.hostname(),
      platform: os.platform(),
      type: os.type(),
      interfaces: ipAddresses,
      fileSharePort: this.port,
      timestamp: Date.now(),
      version: '1.0.0'
    };
  }

  getBroadcastAddresses() {
    const interfaces = os.networkInterfaces();
    const broadcasts = [];
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (!iface.internal && iface.family === 'IPv4') {
          // Calculate broadcast address
          const ip = iface.address.split('.').map(Number);
          const mask = iface.netmask.split('.').map(Number);
          
          const broadcast = ip.map((octet, i) => {
            return octet | (~mask[i] & 255);
          }).join('.');
          
          broadcasts.push(broadcast);
        }
      }
    }
    
    return [...new Set(broadcasts)]; // Remove duplicates
  }

  start() {
    return new Promise((resolve, reject) => {
      this.socket = dgram.createSocket('udp4');
      
      this.socket.on('error', (err) => {
        console.error('🔍 LAN Discovery error:', err);
        reject(err);
      });

      this.socket.on('message', (msg, rinfo) => {
        try {
          const data = JSON.parse(msg.toString());
          this.handleDiscoveryMessage(data, rinfo);
        } catch (error) {
          // Ignore invalid messages
        }
      });

      this.socket.on('listening', () => {
        const address = this.socket.address();
        console.log(`🔍 LAN Discovery listening on ${address.address}:${address.port}`);
        
        // Enable broadcast
        this.socket.setBroadcast(true);
        
        // Start broadcasting our presence
        this.startBroadcasting();
        
        resolve();
      });

      this.socket.bind(this.discoveryPort);
    });
  }

  handleDiscoveryMessage(data, rinfo) {
    if (data.type === 'discovery-announce' && data.deviceId !== this.deviceId) {
      // Another device is announcing itself
      const device = {
        ...data.device,
        lastSeen: Date.now(),
        address: rinfo.address
      };
      
      this.devices.set(data.deviceId, device);
      console.log(`🔍 Discovered device: ${device.hostname} (${device.deviceId}) at ${rinfo.address}`);
      
      // Send response if this is a discovery request
      if (data.responseRequested) {
        this.sendDiscoveryResponse(rinfo.address);
      }
    } else if (data.type === 'discovery-response' && data.deviceId !== this.deviceId) {
      // Response to our discovery request
      const device = {
        ...data.device,
        lastSeen: Date.now(),
        address: rinfo.address
      };
      
      this.devices.set(data.deviceId, device);
      console.log(`🔍 Device responded: ${device.hostname} (${device.deviceId}) at ${rinfo.address}`);
    }
  }

  startBroadcasting() {
    // Broadcast every 30 seconds
    this.broadcastInterval = setInterval(() => {
      this.broadcastPresence();
      this.cleanupOldDevices();
    }, 30000);
    
    // Initial broadcast
    this.broadcastPresence();
  }

  broadcastPresence() {
    const message = {
      type: 'discovery-announce',
      deviceId: this.deviceId,
      device: this.deviceInfo,
      responseRequested: false,
      timestamp: Date.now()
    };

    const broadcasts = this.getBroadcastAddresses();
    const msgBuffer = Buffer.from(JSON.stringify(message));

    broadcasts.forEach(broadcastAddr => {
      this.socket.send(msgBuffer, 0, msgBuffer.length, this.discoveryPort, broadcastAddr, (err) => {
        if (err) {
          console.warn(`🔍 Failed to broadcast to ${broadcastAddr}:`, err.message);
        }
      });
    });
  }

  sendDiscoveryResponse(targetAddress) {
    const message = {
      type: 'discovery-response',
      deviceId: this.deviceId,
      device: this.deviceInfo,
      timestamp: Date.now()
    };

    const msgBuffer = Buffer.from(JSON.stringify(message));
    this.socket.send(msgBuffer, 0, msgBuffer.length, this.discoveryPort, targetAddress);
  }

  discoverDevices() {
    const message = {
      type: 'discovery-announce',
      deviceId: this.deviceId,
      device: this.deviceInfo,
      responseRequested: true,
      timestamp: Date.now()
    };

    const broadcasts = this.getBroadcastAddresses();
    const msgBuffer = Buffer.from(JSON.stringify(message));

    broadcasts.forEach(broadcastAddr => {
      this.socket.send(msgBuffer, 0, msgBuffer.length, this.discoveryPort, broadcastAddr);
    });

    console.log(`🔍 Sent discovery request to ${broadcasts.length} broadcast addresses`);
  }

  cleanupOldDevices() {
    const now = Date.now();
    const timeout = 2 * 60 * 1000; // 2 minutes

    for (const [deviceId, device] of this.devices.entries()) {
      if (now - device.lastSeen > timeout) {
        console.log(`🔍 Device timeout: ${device.hostname} (${deviceId})`);
        this.devices.delete(deviceId);
      }
    }
  }

  getDiscoveredDevices() {
    return Array.from(this.devices.values());
  }

  stop() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

module.exports = LANDiscovery;

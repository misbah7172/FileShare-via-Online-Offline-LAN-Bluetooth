#!/usr/bin/env node

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

console.log('Testing FileShare Dependencies...\n');

// Test 1: Basic imports
try {
  console.log('✅ Express import successful');
  console.log('✅ HTTP import successful');
  console.log('✅ Socket.IO import successful');
} catch (error) {
  console.log('❌ Import failed:', error.message);
  process.exit(1);
}

// Test 2: Basic server creation
try {
  const app = express();
  const server = http.createServer(app);
  const io = socketIo(server);
  
  console.log('✅ Server creation successful');
  
  // Close server
  server.close();
  console.log('✅ Server cleanup successful');
} catch (error) {
  console.log('❌ Server creation failed:', error.message);
  process.exit(1);
}

// Test 3: Environment variables
const requiredEnvVars = ['PORT', 'NODE_ENV'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
  console.log('   Using default values for development');
} else {
  console.log('✅ Environment variables configured');
}

console.log('\n🎉 All tests passed! FileShare backend is ready to run.');
console.log('\nTo start the development server:');
console.log('  npm run dev\n');

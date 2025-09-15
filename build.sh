#!/bin/bash

# Render Build Script for FileShare P2P Platform
echo "Starting Render build process..."

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install server dependencies
echo "Installing server dependencies..."
cd server
npm install
cd ..

# Install client dependencies and build
echo "Installing client dependencies..."
cd client
npm install

echo "Building React client for production..."
npm run build

echo "Build completed successfully!"
echo "Static files are ready to be served from server/public"
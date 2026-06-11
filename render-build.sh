#!/bin/bash

# Exit on any error
set -e

# Pre-deployment script for Render
echo "🚀 Starting Render deployment preparation..."

# Install dependencies
echo "📦 Installing root dependencies..."
npm install

echo "📦 Installing server dependencies..."
cd server && npm install && cd ..

echo "📦 Installing client dependencies..."
cd client && npm install && cd ..

echo "🔨 Building React client for production..."
cd client && npm run build && cd ..

echo "✅ Build completed successfully!"
echo "📁 Static files ready in client/build/"
echo "🌐 Ready for Render deployment!"

# Health check
echo "🔍 Verifying build..."
if [ -d "client/build" ]; then
    echo "✅ Client build directory exists"
    if [ -f "client/build/index.html" ]; then
        echo "✅ index.html found"
    else
        echo "❌ index.html not found in build"
        exit 1
    fi
else
    echo "❌ Client build directory not found"
    exit 1
fi

echo "🎉 Render deployment ready!"
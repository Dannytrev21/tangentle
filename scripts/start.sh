#!/bin/bash

# Executive Brain Startup Script
# Uses PM2 for process management

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Project root is one level up from scripts/
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo ""
echo "🧠 Executive Brain"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for node
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

# Check for TickTick token
if [ -f "$HOME/development/ticktick-mcp/.env" ]; then
    echo "✅ TickTick credentials found"
else
    echo "⚠️  No TickTick credentials (some features limited)"
fi

# Ensure logs directory exists
mkdir -p logs

# Stop any existing PM2 processes for this app
npx pm2 delete all 2>/dev/null

# Start services with PM2
echo ""
echo "🚀 Starting services..."
npx pm2 start ecosystem.config.js

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Executive Brain Running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📱 Web UI:     http://localhost:3001"
echo "📊 Status:     npm run status"
echo "📝 Logs:       npm run logs"
echo "🛑 Stop:       npm stop"
echo ""

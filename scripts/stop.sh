#!/bin/bash

# Executive Brain Stop Script
# Uses PM2 for process management

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Project root is one level up from scripts/
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo ""
echo "🛑 Stopping Executive Brain..."
echo ""

# Stop and delete PM2 processes
npx pm2 stop ecosystem.config.js 2>/dev/null
npx pm2 delete all 2>/dev/null

# Also kill any orphan processes as backup
pkill -f "node src/server.js" 2>/dev/null
pkill -f "node src/processor.js" 2>/dev/null

# Clean up old PID files if they exist
rm -f .server.pid .processor.pid 2>/dev/null

echo "✅ All services stopped"
echo ""

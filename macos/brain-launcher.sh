#!/bin/bash

# Executive Brain Launcher
# This script properly initializes the environment before starting services
# Used by AppleScript app and LaunchAgent

# Load nvm if available
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    source "$NVM_DIR/nvm.sh"
fi

# Fallback: Add common node paths
export PATH="$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -1)/bin:$PATH"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# Change to project directory
cd "$(dirname "$0")/.." || exit 1

# Parse command
case "${1:-start}" in
    start)
        npm start
        ;;
    stop)
        npm stop
        ;;
    restart)
        npm run restart
        ;;
    status)
        npm run status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac

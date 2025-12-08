#!/bin/bash

# Install Executive Brain as a macOS Launch Agent (auto-start on login)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_NAME="com.dannytrevino.executive-brain.plist"
PLIST_SOURCE="$SCRIPT_DIR/$PLIST_NAME"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo ""
echo "🧠 Executive Brain - Auto-Start Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if already installed
if [ -f "$PLIST_DEST" ]; then
    echo "⚠️  Launch Agent already installed"
    echo "   Updating configuration..."
    launchctl unload "$PLIST_DEST" 2>/dev/null
fi

# Create LaunchAgents directory if needed
mkdir -p "$HOME/Library/LaunchAgents"

# Copy plist
cp "$PLIST_SOURCE" "$PLIST_DEST"

# Load the agent
launchctl load "$PLIST_DEST"

echo "✅ Auto-start enabled!"
echo ""
echo "Executive Brain will now start automatically when you log in."
echo ""
echo "To disable: ./macos/uninstall-autostart.sh"
echo ""

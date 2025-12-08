#!/bin/bash

# Uninstall Executive Brain Launch Agent (disable auto-start)

PLIST_NAME="com.dannytrevino.executive-brain.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo ""
echo "🧠 Executive Brain - Auto-Start Uninstaller"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ! -f "$PLIST_DEST" ]; then
    echo "ℹ️  Launch Agent not installed"
    exit 0
fi

# Unload and remove
launchctl unload "$PLIST_DEST" 2>/dev/null
rm -f "$PLIST_DEST"

echo "✅ Auto-start disabled!"
echo ""
echo "Executive Brain will no longer start automatically."
echo "You can still start manually with: npm start"
echo ""

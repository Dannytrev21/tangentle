#!/bin/bash

# Build Executive Brain macOS Apps
# Creates double-clickable apps in /Applications

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "🧠 Building Executive Brain Apps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Build Start App
APP_NAME="Executive Brain"
APP_PATH="/Applications/$APP_NAME.app"

if [ -d "$APP_PATH" ]; then
    echo "Removing existing $APP_NAME..."
    rm -rf "$APP_PATH"
fi

echo "Compiling $APP_NAME..."
osacompile -o "$APP_PATH" "$SCRIPT_DIR/ExecutiveBrain.applescript"

if [ -d "$APP_PATH" ]; then
    echo "✅ Created: $APP_PATH"
else
    echo "❌ Failed to create $APP_NAME"
fi

# Build Stop App
STOP_APP_NAME="Stop Executive Brain"
STOP_APP_PATH="/Applications/$STOP_APP_NAME.app"

if [ -d "$STOP_APP_PATH" ]; then
    echo "Removing existing $STOP_APP_NAME..."
    rm -rf "$STOP_APP_PATH"
fi

echo "Compiling $STOP_APP_NAME..."
osacompile -o "$STOP_APP_PATH" "$SCRIPT_DIR/StopExecutiveBrain.applescript"

if [ -d "$STOP_APP_PATH" ]; then
    echo "✅ Created: $STOP_APP_PATH"
else
    echo "❌ Failed to create $STOP_APP_NAME"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Done!"
echo ""
echo "You can now:"
echo "  • Double-click 'Executive Brain' to start"
echo "  • Double-click 'Stop Executive Brain' to stop"
echo "  • Add them to your Dock"
echo ""

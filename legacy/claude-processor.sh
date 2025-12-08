#!/bin/bash

# Claude Processor for Executive Brain
# This script monitors for /focus commands and processes them with real TickTick data

PENDING_FILE=".pending-commands.json"
RESPONSE_FILE=".command-responses.json"

echo "🧠 Claude Processor Started"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Monitoring for /focus commands..."
echo ""

while true; do
    # Check if there are pending commands
    if [ -f "$PENDING_FILE" ]; then
        # Check if file is not empty
        if [ -s "$PENDING_FILE" ]; then
            # Read the pending commands
            PENDING=$(cat "$PENDING_FILE")

            # Check if there are any /focus commands
            if echo "$PENDING" | grep -q '"command":"/focus"'; then
                echo "📥 Detected /focus command!"
                echo "Processing with TickTick MCP..."

                # Extract command ID
                COMMAND_ID=$(echo "$PENDING" | grep -o '"cmd_[^"]*"' | head -1 | tr -d '"')

                if [ ! -z "$COMMAND_ID" ]; then
                    echo "Command ID: $COMMAND_ID"
                    echo ""
                    echo "⏳ Execute this command in Claude Code:"
                    echo ""
                    echo "claude process-focus $COMMAND_ID"
                    echo ""
                fi
            fi
        fi
    fi

    sleep 2
done
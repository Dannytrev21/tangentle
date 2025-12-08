#!/bin/bash

# Claude Code Conversation Responder
# This script monitors for conversation requests and alerts when Claude needs to respond

REQUESTS_FILE=".claude-requests.json"
CHECK_INTERVAL=2

echo "🧠 Claude Code Conversation Responder"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👀 Monitoring for conversation requests..."
echo ""

while true; do
    if [ -f "$REQUESTS_FILE" ]; then
        PENDING=$(cat "$REQUESTS_FILE" | grep -o '"requests":\[.*\]' | grep -o '\[.*\]')

        if [ "$PENDING" != "[]" ]; then
            echo ""
            echo "📢 NEW CONVERSATION REQUEST!"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            cat "$REQUESTS_FILE" | node -e "
                const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
                data.requests.forEach(req => {
                    console.log('Request ID:', req.id);
                    console.log('Type:', req.type);
                    console.log('Command ID:', req.commandId);
                    if (req.userResponse) {
                        console.log('User said:', req.userResponse);
                    }
                    if (req.tickTickData) {
                        console.log('TickTick data available: Yes');
                    }
                    console.log('');
                });
            "
            echo "💡 In Claude Code, run:"
            echo "   node process-claude-request.js"
            echo ""
            echo "Or tell me: 'process evening conversation'"
            echo ""
        fi
    fi

    sleep $CHECK_INTERVAL
done
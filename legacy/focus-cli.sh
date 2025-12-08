#!/bin/bash

# Executive Brain - /focus Command
# This triggers a /focus command and Claude responds with real TickTick data

echo "🎯 Executive Brain - Focus Command"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Fetching your priority tasks from TickTick..."
echo ""

# Send the /focus command
RESPONSE=$(curl -s -X POST http://localhost:3001/api/command \
  -H "Content-Type: application/json" \
  -d "{\"command\":\"/focus\",\"sessionId\":\"cli_$(date +%s)\"}")

# Parse and display the response
echo "$RESPONSE" | node -e "
const input = require('fs').readFileSync(0, 'utf-8');
try {
    const data = JSON.parse(input);
    console.log(data.message);
} catch(e) {
    console.log(input);
}
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
#!/bin/bash

# Claude Code tmux Runner
# Starts Claude Code in a tmux session for programmatic control

SESSION_NAME="claude-brain"
WORKING_DIR="/Users/dannytrevino/development/executive-brain"

echo "🧠 Claude Code tmux Runner"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "❌ tmux is not installed"
    echo "   Install with: brew install tmux"
    exit 1
fi

# Check if session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "⚠️  Session '$SESSION_NAME' already exists"
    echo ""
    echo "Options:"
    echo "  1. Attach to it:  tmux attach -t $SESSION_NAME"
    echo "  2. Kill it:       tmux kill-session -t $SESSION_NAME"
    echo "  3. Send command:  tmux send-keys -t $SESSION_NAME 'your message' Enter"
    echo ""
    read -p "Kill existing session and start fresh? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        tmux kill-session -t "$SESSION_NAME"
        echo "✅ Killed existing session"
    else
        echo "Attaching to existing session..."
        tmux attach -t "$SESSION_NAME"
        exit 0
    fi
fi

echo "🚀 Starting Claude Code in tmux session: $SESSION_NAME"
echo ""

# Create new tmux session with Claude Code
# -d = detached, -s = session name, -c = working directory
tmux new-session -d -s "$SESSION_NAME" -c "$WORKING_DIR"

# Send the claude command to start Claude Code
tmux send-keys -t "$SESSION_NAME" "claude" Enter

echo "✅ Claude Code started in tmux session: $SESSION_NAME"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Commands:"
echo "   Attach:      tmux attach -t $SESSION_NAME"
echo "   Detach:      Ctrl+B then D (from inside tmux)"
echo "   Kill:        tmux kill-session -t $SESSION_NAME"
echo "   Send input:  tmux send-keys -t $SESSION_NAME 'message' Enter"
echo ""
echo "🔄 The input injector will automatically send 'process now'"
echo "   when commands arrive from the WebUI."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Option to attach immediately
read -p "Attach to session now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    tmux attach -t "$SESSION_NAME"
fi

#!/usr/bin/env node

/**
 * Claude Code Command Watcher
 * Monitors for commands from the web UI and executes them in Claude Code
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const COMMAND_QUEUE = path.join(__dirname, '.command-queue.json');
const RESPONSE_FILE = path.join(__dirname, '.command-responses.json');

// Initialize files
if (!fs.existsSync(COMMAND_QUEUE)) {
    fs.writeFileSync(COMMAND_QUEUE, JSON.stringify({ commands: [] }, null, 2));
}
if (!fs.existsSync(RESPONSE_FILE)) {
    fs.writeFileSync(RESPONSE_FILE, '{}');
}

let processedCommands = new Set();

console.log('🧠 Claude Code Command Watcher');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('👀 Monitoring for commands from web UI...\n');

// Load TickTick helper functions
const loadResponses = () => {
    if (fs.existsSync(RESPONSE_FILE)) {
        return JSON.parse(fs.readFileSync(RESPONSE_FILE, 'utf8'));
    }
    return {};
};

const saveResponse = (commandId, response) => {
    const responses = loadResponses();
    responses[commandId] = {
        response,
        timestamp: Date.now()
    };
    fs.writeFileSync(RESPONSE_FILE, JSON.stringify(responses, null, 2));
    console.log(`✅ Response saved for ${commandId}\n`);
};

// This will be called by the watcher when a /focus command is detected
global.processFocusCommand = async (commandId, sessionId) => {
    console.log(`🎯 Processing /focus command: ${commandId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Tell user what we're doing
    console.log('📊 Fetching priority tasks from TickTick...\n');
    console.log('This command will:');
    console.log('  1. Get all overdue HIGH priority tasks');
    console.log('  2. Get all overdue MEDIUM priority tasks');
    console.log('  3. Get today\'s HIGH priority tasks');
    console.log('  4. Get today\'s MEDIUM priority tasks\n');

    // Return the command info so Claude can process it
    return {
        commandId,
        sessionId,
        action: 'focus',
        needsTickTick: true
    };
};

// Watch for new commands in the queue
const watchQueue = () => {
    if (!fs.existsSync(COMMAND_QUEUE)) return;

    try {
        const data = fs.readFileSync(COMMAND_QUEUE, 'utf8');
        const queue = JSON.parse(data);

        if (queue.commands && queue.commands.length > 0) {
            for (const cmd of queue.commands) {
                const cmdKey = `${cmd.id}_${cmd.timestamp}`;

                if (!processedCommands.has(cmdKey)) {
                    processedCommands.add(cmdKey);

                    console.log(`\n📥 New command received!`);
                    console.log(`Command: ${cmd.command}`);
                    console.log(`ID: ${cmd.id}`);
                    console.log(`Session: ${cmd.sessionId}\n`);

                    if (cmd.command === '/focus') {
                        const info = global.processFocusCommand(cmd.id, cmd.sessionId);
                        console.log('⏳ Waiting for Claude Code to process with TickTick MCP...\n');
                        console.log('💡 In Claude Code, you should now:');
                        console.log('   1. Fetch the TickTick data using MCP tools');
                        console.log('   2. Format the response');
                        console.log('   3. Call: respondToCommand("' + cmd.id + '", response)\n');
                    }

                    // Remove from queue after processing
                    queue.commands = queue.commands.filter(c => c.id !== cmd.id);
                    fs.writeFileSync(COMMAND_QUEUE, JSON.stringify(queue, null, 2));
                }
            }
        }
    } catch (err) {
        // Ignore parse errors
    }
};

// Function to respond to a command (to be called by Claude Code)
global.respondToCommand = (commandId, response) => {
    saveResponse(commandId, response);
    console.log(`✅ Response sent to web UI for command: ${commandId}`);
};

// Export for use in Claude Code
module.exports = {
    respondToCommand: global.respondToCommand,
    processFocusCommand: global.processFocusCommand
};

// Start watching
console.log('✅ Watcher started\n');
console.log('💡 Tip: Keep this running while using the web UI');
console.log('💡 When a command comes in, I\'ll tell you what to do!\n');

setInterval(watchQueue, 1000);

// Keep process alive
process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping watcher...');
    process.exit(0);
});

// If running directly, keep alive
if (require.main === module) {
    console.log('🔄 Watching for commands...\n');
}
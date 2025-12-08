#!/usr/bin/env node

// This script watches for pending /focus commands and processes them
// It's meant to be run by Claude to provide real TickTick responses

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PENDING_FILE = path.join(__dirname, '.pending-commands.json');
const RESPONSE_FILE = path.join(__dirname, '.command-responses.json');

let processedCommands = new Set();

console.log('🧠 Executive Brain - Claude Responder');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('👀 Watching for /focus commands...\n');

// Initialize files if they don't exist
if (!fs.existsSync(PENDING_FILE)) {
    fs.writeFileSync(PENDING_FILE, '{}');
}
if (!fs.existsSync(RESPONSE_FILE)) {
    fs.writeFileSync(RESPONSE_FILE, '{}');
}

// Function to process a /focus command with real TickTick data
async function processFocusCommand(commandId, commandData) {
    console.log(`\n🎯 Processing /focus command: ${commandId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // This is where we tell Claude to respond
    console.log('⚡ Claude should now fetch TickTick data and respond...');
    console.log(`\nTo respond, create a response like this in Claude Code:\n`);
    console.log(`const response = {`);
    console.log(`  message: "🎯 FOCUS MODE...[your formatted task list]",`);
    console.log(`  waitingFor: true`);
    console.log(`};\n`);
    console.log(`Then save it with:`);
    console.log(`saveResponse('${commandId}', response);\n`);

    return commandId;
}

// Function to save response from Claude
function saveResponse(commandId, responseData) {
    const responses = fs.existsSync(RESPONSE_FILE)
        ? JSON.parse(fs.readFileSync(RESPONSE_FILE, 'utf8'))
        : {};

    responses[commandId] = {
        response: responseData,
        timestamp: Date.now()
    };

    fs.writeFileSync(RESPONSE_FILE, JSON.stringify(responses, null, 2));
    console.log(`✅ Response saved for ${commandId}`);
}

// Make saveResponse available globally for Claude to call
global.saveResponse = saveResponse;

// Watch for new commands
setInterval(() => {
    if (fs.existsSync(PENDING_FILE)) {
        const content = fs.readFileSync(PENDING_FILE, 'utf8');
        if (content && content.trim() !== '{}') {
            try {
                const pending = JSON.parse(content);
                const commandIds = Object.keys(pending);

                for (const commandId of commandIds) {
                    if (!processedCommands.has(commandId)) {
                        processedCommands.add(commandId);
                        const commandData = pending[commandId];

                        if (commandData.command === '/focus') {
                            processFocusCommand(commandId, commandData);
                        }
                    }
                }
            } catch (err) {
                // Ignore JSON parse errors
            }
        }
    }
}, 1000);

// Keep the script running
process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping watcher...');
    process.exit(0);
});

console.log('✅ Watcher started successfully');
console.log('💡 Tip: Keep this running while using the web UI\n');
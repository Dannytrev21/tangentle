#!/usr/bin/env node

// This script is meant to be run by Claude to process /focus commands with real TickTick data
// Usage: node process-focus.js <command-id>

const fs = require('fs');
const path = require('path');

const commandId = process.argv[2];

if (!commandId) {
    console.error('❌ Error: Command ID required');
    console.error('Usage: node process-focus.js <command-id>');
    process.exit(1);
}

const PENDING_FILE = path.join(__dirname, '.pending-commands.json');
const RESPONSE_FILE = path.join(__dirname, '.command-responses.json');

// Check if command exists
if (!fs.existsSync(PENDING_FILE)) {
    console.error('❌ No pending commands found');
    process.exit(1);
}

const pending = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));

if (!pending[commandId]) {
    console.error(`❌ Command ${commandId} not found`);
    process.exit(1);
}

console.log(`\n🎯 Processing /focus command: ${commandId}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// This is where Claude should fill in the real TickTick data
// For now, output instructions for Claude

console.log('📋 Instructions for Claude:');
console.log('');
console.log('1. Fetch data from TickTick MCP:');
console.log('   - Get overdue tasks with priority 5 (High) and 3 (Medium)');
console.log('   - Get today tasks with priority 5 (High) and 3 (Medium)');
console.log('');
console.log('2. Format the response like this:');
console.log('');
console.log('```javascript');
console.log('const response = {');
console.log('  message: `🎯 **FOCUS MODE**\\n\\n...[formatted tasks]...`,');
console.log('  waitingFor: true');
console.log('};');
console.log('```');
console.log('');
console.log('3. Save the response using:');
console.log(`   node save-response.js ${commandId} '<response-json>'`);
console.log('');

// Function to save response (Claude will call this)
function saveResponse(responseData) {
    const responses = fs.existsSync(RESPONSE_FILE)
        ? JSON.parse(fs.readFileSync(RESPONSE_FILE, 'utf8'))
        : {};

    responses[commandId] = {
        response: responseData,
        timestamp: Date.now()
    };

    fs.writeFileSync(RESPONSE_FILE, JSON.stringify(responses, null, 2));
    console.log('✅ Response saved successfully');
}

module.exports = { saveResponse };
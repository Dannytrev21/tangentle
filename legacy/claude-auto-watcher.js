#!/usr/bin/env node

/**
 * Claude Auto-Watcher
 * Automatically detects pending Claude requests and prompts you to process them
 * Run this alongside your other services
 */

const fs = require('fs');
const path = require('path');
const { getPendingClaudeRequests } = require('./claude-handler.js');

const CLAUDE_REQUESTS = path.join(__dirname, '.claude-requests.json');
let lastCheckTime = Date.now();
let processedRequests = new Set();

console.log('👁️  Claude Auto-Watcher Started');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Watching for new Claude Code requests...\n');

function checkForNewRequests() {
    const requests = getPendingClaudeRequests();

    for (const request of requests) {
        // Skip if we've already processed this request
        if (processedRequests.has(request.id)) {
            continue;
        }

        // Mark as processed
        processedRequests.add(request.id);

        // Show the request details
        console.log('\n🔔 NEW REQUEST DETECTED!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📋 Type: ${request.type}`);
        console.log(`🆔 ID: ${request.id}`);
        console.log(`⏰ Time: ${new Date(request.timestamp).toLocaleTimeString()}\n`);

        // Show what to do
        if (request.type === 'morning_planning') {
            console.log('💡 ACTION NEEDED: Type "process morning" in Claude Code');
        } else if (request.type === 'evening_review') {
            console.log('💡 ACTION NEEDED: Type "process evening" in Claude Code');
        } else if (request.type === 'focus') {
            console.log('💡 ACTION NEEDED: Type "process focus" in Claude Code');
        } else {
            console.log(`💡 ACTION NEEDED: Type "process ${request.type}" in Claude Code`);
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
}

// Watch for file changes
fs.watch(CLAUDE_REQUESTS, (eventType, filename) => {
    if (eventType === 'change') {
        checkForNewRequests();
    }
});

// Also poll every 5 seconds as a backup
setInterval(checkForNewRequests, 5000);

// Initial check
checkForNewRequests();

// Cleanup on exit
process.on('SIGINT', () => {
    console.log('\n\n👋 Auto-watcher stopped');
    process.exit(0);
});

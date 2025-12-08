#!/usr/bin/env node

/**
 * Claude Conversation Handler
 * This module handles the /evening command with real Claude Code intelligence
 * It signals when Claude needs to respond with custom analysis
 */

const fs = require('fs');
const path = require('path');

const CLAUDE_REQUESTS = path.join(__dirname, '.claude-requests.json');
const CLAUDE_RESPONSES = path.join(__dirname, '.claude-responses.json');
const MEMORIES_FILE = path.join(__dirname, 'memories.json');
const CLAUDE_MD = path.join(__dirname, 'CLAUDE.md');
const SCHEDULE_FILE = path.join(__dirname, 'schedule.json');

// Initialize request queue
if (!fs.existsSync(CLAUDE_REQUESTS)) {
    fs.writeFileSync(CLAUDE_REQUESTS, JSON.stringify({ requests: [] }, null, 2));
}
if (!fs.existsSync(CLAUDE_RESPONSES)) {
    fs.writeFileSync(CLAUDE_RESPONSES, '{}');
}

/**
 * Request Claude Code to handle a conversation
 * This creates a request that Claude Code will pick up and process
 */
function requestClaudeConversation(request) {
    const requests = JSON.parse(fs.readFileSync(CLAUDE_REQUESTS, 'utf8'));

    const requestData = {
        id: `claude_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        ...request
    };

    requests.requests.push(requestData);
    fs.writeFileSync(CLAUDE_REQUESTS, JSON.stringify(requests, null, 2));

    console.log(`\n🤖 Claude Code request created: ${requestData.id}`);
    console.log(`   Type: ${request.type}`);
    console.log(`   Waiting for Claude to respond...\n`);

    return requestData.id;
}

/**
 * Wait for Claude Code response
 */
async function waitForClaudeResponse(requestId, timeout = 300000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        if (fs.existsSync(CLAUDE_RESPONSES)) {
            const responses = JSON.parse(fs.readFileSync(CLAUDE_RESPONSES, 'utf8'));

            if (responses[requestId]) {
                const response = responses[requestId];

                // Clean up
                delete responses[requestId];
                fs.writeFileSync(CLAUDE_RESPONSES, JSON.stringify(responses, null, 2));

                // Remove from requests
                const requests = JSON.parse(fs.readFileSync(CLAUDE_REQUESTS, 'utf8'));
                requests.requests = requests.requests.filter(r => r.id !== requestId);
                fs.writeFileSync(CLAUDE_REQUESTS, JSON.stringify(requests, null, 2));

                return response;
            }
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error('Claude response timeout');
}

/**
 * Save Claude's response
 */
function saveClaudeResponse(requestId, response) {
    const responses = fs.existsSync(CLAUDE_RESPONSES)
        ? JSON.parse(fs.readFileSync(CLAUDE_RESPONSES, 'utf8'))
        : {};

    responses[requestId] = {
        response,
        timestamp: Date.now()
    };

    fs.writeFileSync(CLAUDE_RESPONSES, JSON.stringify(responses, null, 2));
    console.log(`✅ Claude response saved for ${requestId}`);
}

/**
 * Load context for Claude
 */
function loadContext() {
    const context = {
        memories: {},
        claudeMd: '',
        profile: {},
        schedule: {}
    };

    // Load memories
    if (fs.existsSync(MEMORIES_FILE)) {
        context.memories = JSON.parse(fs.readFileSync(MEMORIES_FILE, 'utf8'));
    }

    // Load CLAUDE.md
    if (fs.existsSync(CLAUDE_MD)) {
        context.claudeMd = fs.readFileSync(CLAUDE_MD, 'utf8');
    }

    // Load schedule
    if (fs.existsSync(SCHEDULE_FILE)) {
        context.schedule = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
    }

    // Extract Danny's profile from CLAUDE.md
    if (context.claudeMd) {
        const profileMatch = context.claudeMd.match(/## Danny's Profile([\s\S]*?)##/);
        if (profileMatch) {
            context.profile.raw = profileMatch[1];
        }
    }

    return context;
}

/**
 * Get pending Claude requests
 */
function getPendingClaudeRequests() {
    if (fs.existsSync(CLAUDE_REQUESTS)) {
        const data = JSON.parse(fs.readFileSync(CLAUDE_REQUESTS, 'utf8'));
        return data.requests || [];
    }
    return [];
}

module.exports = {
    requestClaudeConversation,
    waitForClaudeResponse,
    saveClaudeResponse,
    loadContext,
    getPendingClaudeRequests
};
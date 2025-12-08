#!/usr/bin/env node
/**
 * Response Helper for Executive Brain
 *
 * Claude Code calls this to send responses back to the WebUI.
 * Usage: node respond.js <commandId> <message> [options]
 *
 * Or require it:
 *   const { respond, getLatestCommand } = require('./respond.js');
 *   respond(commandId, { message: "...", waitingFor: true });
 */

const fs = require('fs');
const path = require('path');

const RESPONSE_FILE = path.join(__dirname, '.command-responses.json');
const COMMAND_QUEUE = path.join(__dirname, '.command-queue.json');
const MEMORIES_FILE = path.join(__dirname, 'memories.json');

// Load existing responses
function loadResponses() {
    if (fs.existsSync(RESPONSE_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(RESPONSE_FILE, 'utf8'));
        } catch (e) {
            return {};
        }
    }
    return {};
}

// Save response for a command
function respond(commandId, responseData) {
    const responses = loadResponses();

    // Ensure response is properly wrapped
    responses[commandId] = {
        response: responseData,
        timestamp: Date.now()
    };

    fs.writeFileSync(RESPONSE_FILE, JSON.stringify(responses, null, 2));
    console.log(`[Respond] Saved response for ${commandId}`);
    return true;
}

// Get the latest unprocessed command from queue
function getLatestCommand() {
    if (!fs.existsSync(COMMAND_QUEUE)) {
        return null;
    }

    try {
        const queue = JSON.parse(fs.readFileSync(COMMAND_QUEUE, 'utf8'));
        if (queue.commands && queue.commands.length > 0) {
            return queue.commands[queue.commands.length - 1];
        }
    } catch (e) {
        console.error('[Respond] Error reading queue:', e.message);
    }
    return null;
}

// Get all pending commands
function getPendingCommands() {
    if (!fs.existsSync(COMMAND_QUEUE)) {
        return [];
    }

    try {
        const queue = JSON.parse(fs.readFileSync(COMMAND_QUEUE, 'utf8'));
        const responses = loadResponses();

        // Filter out commands that already have responses
        return (queue.commands || []).filter(cmd => !responses[cmd.id]);
    } catch (e) {
        return [];
    }
}

// Clear processed commands from queue
function clearProcessedCommands() {
    const responses = loadResponses();

    if (!fs.existsSync(COMMAND_QUEUE)) return;

    try {
        const queue = JSON.parse(fs.readFileSync(COMMAND_QUEUE, 'utf8'));

        // Keep only commands without responses
        queue.commands = (queue.commands || []).filter(cmd => !responses[cmd.id]);

        fs.writeFileSync(COMMAND_QUEUE, JSON.stringify(queue, null, 2));
        console.log(`[Respond] Cleaned up command queue`);
    } catch (e) {
        console.error('[Respond] Error cleaning queue:', e.message);
    }
}

// ============================================================
// MEMORY SYSTEM
// ============================================================

function loadMemories() {
    if (fs.existsSync(MEMORIES_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(MEMORIES_FILE, 'utf8'));
        } catch (e) {
            return { preferences: {}, patterns: {}, context: {} };
        }
    }
    return { preferences: {}, patterns: {}, context: {} };
}

function saveMemories(memories) {
    fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memories, null, 2));
}

// Remember something about the user
function remember(key, value, category = 'context') {
    const memories = loadMemories();
    if (!memories[category]) memories[category] = {};
    memories[category][key] = {
        value,
        timestamp: Date.now()
    };
    saveMemories(memories);
    console.log(`[Memory] Remembered ${category}.${key}`);
}

// Recall something
function recall(key, category = 'context') {
    const memories = loadMemories();
    if (memories[category] && memories[category][key]) {
        return memories[category][key].value;
    }
    return null;
}

// Get all memories for context
function getAllMemories() {
    return loadMemories();
}

// ============================================================
// CLI INTERFACE
// ============================================================

if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        // Show latest command
        const cmd = getLatestCommand();
        if (cmd) {
            console.log('\n📥 Latest Command:');
            console.log(`   ID: ${cmd.id}`);
            console.log(`   Command: ${cmd.command || cmd.fullCommand}`);
            console.log(`   Time: ${new Date(cmd.timestamp).toLocaleString()}`);
            if (cmd.message) console.log(`   Message: ${cmd.message}`);
            if (cmd.project) console.log(`   Project: ${cmd.project.name}`);
        } else {
            console.log('No pending commands');
        }

        const pending = getPendingCommands();
        if (pending.length > 1) {
            console.log(`\n📋 ${pending.length} total pending commands`);
        }
        process.exit(0);
    }

    if (args[0] === '--pending') {
        const pending = getPendingCommands();
        console.log(`\n📋 Pending Commands (${pending.length}):\n`);
        pending.forEach((cmd, i) => {
            console.log(`${i + 1}. [${cmd.id}] ${cmd.command || cmd.fullCommand}`);
        });
        process.exit(0);
    }

    if (args[0] === '--clean') {
        clearProcessedCommands();
        process.exit(0);
    }

    if (args[0] === '--memories') {
        const memories = getAllMemories();
        console.log('\n🧠 Memories:\n');
        console.log(JSON.stringify(memories, null, 2));
        process.exit(0);
    }

    // respond <commandId> <message>
    if (args.length >= 2) {
        const commandId = args[0];
        const message = args.slice(1).join(' ');

        respond(commandId, {
            message,
            status: 'success',
            timestamp: Date.now()
        });

        console.log('Response saved successfully');
        process.exit(0);
    }

    console.log(`
Usage:
  node respond.js                    Show latest command
  node respond.js --pending          Show all pending commands
  node respond.js --clean            Clear processed commands
  node respond.js --memories         Show all memories
  node respond.js <id> <message>     Send response for command
`);
}

module.exports = {
    respond,
    getLatestCommand,
    getPendingCommands,
    clearProcessedCommands,
    remember,
    recall,
    getAllMemories,
    loadMemories,
    saveMemories
};

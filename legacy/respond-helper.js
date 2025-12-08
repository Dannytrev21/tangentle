// Helper module for Claude to respond to /focus commands with real TickTick data

const fs = require('fs');
const path = require('path');

const RESPONSE_FILE = path.join(__dirname, '.command-responses.json');

function saveResponse(commandId, responseData) {
    const responses = fs.existsSync(RESPONSE_FILE)
        ? JSON.parse(fs.readFileSync(RESPONSE_FILE, 'utf8'))
        : {};

    responses[commandId] = {
        response: responseData,
        timestamp: Date.now()
    };

    fs.writeFileSync(RESPONSE_FILE, JSON.stringify(responses, null, 2));
    console.log(`✅ Response saved for command: ${commandId}`);
    return true;
}

function getPendingCommands() {
    const PENDING_FILE = path.join(__dirname, '.pending-commands.json');
    if (fs.existsSync(PENDING_FILE)) {
        const content = fs.readFileSync(PENDING_FILE, 'utf8');
        return content ? JSON.parse(content) : {};
    }
    return {};
}

module.exports = {
    saveResponse,
    getPendingCommands
};
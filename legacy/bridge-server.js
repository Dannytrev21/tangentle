const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Store for communication between Claude and the web UI
const messageQueue = new Map();
const responseQueue = new Map();

// Generate unique request IDs
let requestCounter = 0;
function generateRequestId() {
    return `req_${Date.now()}_${++requestCounter}`;
}

// Bridge endpoint - UI sends commands here
app.post('/api/bridge', async (req, res) => {
    const { command, sessionId } = req.body;

    if (!command || !sessionId) {
        return res.status(400).json({ error: 'Command and session ID required' });
    }

    const requestId = generateRequestId();

    // Store the command for Claude to process
    messageQueue.set(requestId, {
        command,
        sessionId,
        timestamp: Date.now()
    });

    console.log(`[Bridge] Received command: "${command}" for session ${sessionId}`);

    // Wait for Claude's response (with timeout)
    const timeout = 30000; // 30 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        if (responseQueue.has(requestId)) {
            const response = responseQueue.get(requestId);
            responseQueue.delete(requestId);
            messageQueue.delete(requestId);
            return res.json(response);
        }
        await new Promise(resolve => setTimeout(resolve, 100)); // Check every 100ms
    }

    // Timeout
    messageQueue.delete(requestId);
    return res.status(504).json({
        error: 'Request timed out',
        message: 'Please make sure Claude is processing commands'
    });
});

// Endpoint for Claude to get pending commands
app.get('/api/pending', (req, res) => {
    const pending = Array.from(messageQueue.entries()).map(([id, data]) => ({
        id,
        ...data
    }));
    res.json({ pending });
});

// Endpoint for Claude to send responses
app.post('/api/respond', (req, res) => {
    const { requestId, response } = req.body;

    if (!requestId || !response) {
        return res.status(400).json({ error: 'Request ID and response required' });
    }

    responseQueue.set(requestId, response);
    console.log(`[Bridge] Stored response for request ${requestId}`);

    res.json({ success: true });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'running',
        pendingRequests: messageQueue.size,
        pendingResponses: responseQueue.size
    });
});

app.listen(PORT, () => {
    console.log(`Executive Brain Bridge Server running on http://localhost:${PORT}`);
    console.log(`\n📌 Instructions:`);
    console.log(`1. Open http://localhost:${PORT} in your browser`);
    console.log(`2. Use the UI to send commands`);
    console.log(`3. Claude will process them using the real TickTick MCP connection`);
});
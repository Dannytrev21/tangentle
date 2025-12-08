/**
 * Claude Input Injector
 *
 * Watches .command-queue.json for new commands and automatically
 * injects "process now" (or specific commands) into the Claude Code
 * tmux session.
 *
 * This allows full automation while using Claude Code with your
 * existing subscription (Opus 4.5).
 */

const chokidar = require('chokidar');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    tmuxSession: 'claude-brain',
    commandQueueFile: path.join(__dirname, '.command-queue.json'),
    debounceMs: 500,  // Debounce file changes
    autoAccept: true, // Auto-accept Claude Code prompts
    verbose: true
};

// Track last processed to avoid duplicates
let lastProcessedTimestamp = 0;
let isProcessing = false;
let debounceTimer = null;

function log(message) {
    if (CONFIG.verbose) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${message}`);
    }
}

// Check if tmux session exists
function sessionExists() {
    try {
        execSync(`tmux has-session -t ${CONFIG.tmuxSession} 2>/dev/null`);
        return true;
    } catch (e) {
        return false;
    }
}

// Send keys to tmux session
function sendToTmux(text, pressEnter = true) {
    if (!sessionExists()) {
        log(`❌ tmux session '${CONFIG.tmuxSession}' not found`);
        log(`   Start it with: ./claude-tmux-runner.sh`);
        return false;
    }

    try {
        // Use -l for literal text to avoid interpretation issues
        // Then send Enter (C-m) separately
        execSync(`tmux send-keys -t ${CONFIG.tmuxSession} -l '${text.replace(/'/g, "'\\''")}'`);

        if (pressEnter) {
            // C-m is Ctrl+M which is equivalent to Enter
            execSync(`tmux send-keys -t ${CONFIG.tmuxSession} C-m`);
        }

        log(`📤 Sent to Claude: "${text}"`);
        return true;
    } catch (error) {
        log(`❌ Failed to send to tmux: ${error.message}`);
        return false;
    }
}

// Send 'y' to accept prompts (for tool confirmations)
function acceptPrompt() {
    if (CONFIG.autoAccept) {
        setTimeout(() => {
            sendToTmux('y', true);
        }, 500);
    }
}

// Check queue and inject command if needed
function checkAndProcess() {
    if (isProcessing) {
        log('⏳ Already processing, skipping...');
        return;
    }

    try {
        if (!fs.existsSync(CONFIG.commandQueueFile)) {
            return;
        }

        const content = fs.readFileSync(CONFIG.commandQueueFile, 'utf8');
        const queue = JSON.parse(content);

        if (!queue.commands || queue.commands.length === 0) {
            return;
        }

        // Check if there are new commands (by timestamp)
        const latestCommand = queue.commands[queue.commands.length - 1];

        if (latestCommand.timestamp <= lastProcessedTimestamp) {
            return; // Already processed
        }

        isProcessing = true;
        lastProcessedTimestamp = latestCommand.timestamp;

        log(`\n🆕 New command detected: ${latestCommand.command || latestCommand.id}`);
        log(`   ID: ${latestCommand.id}`);

        // Include command ID in the message so Claude knows which command to respond to
        const cmdId = latestCommand.id;
        let messageToSend = `process command ${cmdId}`;

        if (latestCommand.command === '/project-chat') {
            messageToSend = `process project chat [${cmdId}]`;
        } else if (latestCommand.command === '/generate-project-tasks') {
            messageToSend = `process project tasks [${cmdId}]`;
        } else if (latestCommand.command === '/now') {
            messageToSend = `process /now [${cmdId}]`;
        } else if (latestCommand.command === '/checkin') {
            messageToSend = `process /checkin [${cmdId}]`;
        } else if (latestCommand.command === '/morning') {
            messageToSend = `process /morning [${cmdId}]`;
        } else if (latestCommand.command === '/evening') {
            messageToSend = `process /evening [${cmdId}]`;
        }

        // Send to Claude Code
        const sent = sendToTmux(messageToSend);

        if (sent) {
            log(`✅ Command injected successfully`);

            // Set up auto-accept for any prompts
            if (CONFIG.autoAccept) {
                // Check for prompts periodically for a short time
                let acceptAttempts = 0;
                const acceptInterval = setInterval(() => {
                    acceptAttempts++;
                    // After 10 seconds, stop trying
                    if (acceptAttempts > 20) {
                        clearInterval(acceptInterval);
                        isProcessing = false;
                        return;
                    }
                }, 500);

                // Reset processing flag after timeout
                setTimeout(() => {
                    clearInterval(acceptInterval);
                    isProcessing = false;
                }, 30000); // 30 second timeout
            } else {
                // Reset after a delay
                setTimeout(() => {
                    isProcessing = false;
                }, 5000);
            }
        } else {
            isProcessing = false;
        }

    } catch (error) {
        log(`❌ Error checking queue: ${error.message}`);
        isProcessing = false;
    }
}

// Debounced check
function debouncedCheck() {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(checkAndProcess, CONFIG.debounceMs);
}

// Manual trigger function (called from backend)
function manualTrigger(message = 'process now') {
    log(`\n🔘 Manual trigger: "${message}"`);
    return sendToTmux(message);
}

// Start watching
function startWatcher() {
    console.log(`
🔌 Claude Input Injector
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 Watching: ${CONFIG.commandQueueFile}
🖥️  tmux session: ${CONFIG.tmuxSession}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

    // Check if tmux session exists
    if (!sessionExists()) {
        console.log(`⚠️  tmux session '${CONFIG.tmuxSession}' not found!`);
        console.log(`   Start Claude Code first: ./claude-tmux-runner.sh`);
        console.log(`\n   Waiting for session to appear...`);
    } else {
        console.log(`✅ tmux session found`);
    }

    console.log(`\n👀 Watching for commands...\n`);

    // Initial check
    checkAndProcess();

    // Watch for file changes
    const watcher = chokidar.watch(CONFIG.commandQueueFile, {
        persistent: true,
        ignoreInitial: true
    });

    watcher.on('change', (filepath) => {
        log(`📝 Queue file changed`);
        debouncedCheck();
    });

    watcher.on('error', (error) => {
        log(`❌ Watcher error: ${error.message}`);
    });

    // Also expose manual trigger via simple HTTP server for WebUI
    const http = require('http');
    const TRIGGER_PORT = 3002;

    const server = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        if (req.url === '/trigger' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const data = JSON.parse(body || '{}');
                    const message = data.message || 'process now';
                    const success = manualTrigger(message);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success, message: success ? 'Command sent' : 'Failed to send' }));
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: e.message }));
                }
            });
        } else if (req.url === '/trigger' && req.method === 'GET') {
            // Simple GET trigger
            const success = manualTrigger('process now');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success }));
        } else if (req.url === '/status') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                tmuxSession: CONFIG.tmuxSession,
                sessionExists: sessionExists(),
                isProcessing,
                lastProcessedTimestamp
            }));
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    });

    server.listen(TRIGGER_PORT, () => {
        console.log(`🌐 Trigger server running on http://localhost:${TRIGGER_PORT}`);
        console.log(`   GET  /trigger - Send "process now"`);
        console.log(`   POST /trigger - Send custom message`);
        console.log(`   GET  /status  - Check status\n`);
    });
}

// Handle shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down injector...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down injector...');
    process.exit(0);
});

// Start
startWatcher();

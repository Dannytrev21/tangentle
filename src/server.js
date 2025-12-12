// TickTick Bridge for Executive Brain
// This module handles communication between the web server and Claude's TickTick MCP

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const chokidar = require('chokidar');

const app = express();
const PORT = process.env.PORT || 3001;

// Project root directory (one level up from src/)
const ROOT_DIR = path.join(__dirname, '..');

// Create HTTP server for both Express and WebSocket
const server = http.createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ server });

// Track connected clients
const wsClients = new Set();

wss.on('connection', (ws) => {
    console.log('[WS] Client connected');
    wsClients.add(ws);

    ws.on('close', () => {
        console.log('[WS] Client disconnected');
        wsClients.delete(ws);
    });

    ws.on('error', (err) => {
        console.error('[WS] Error:', err.message);
        wsClients.delete(ws);
    });

    // Send welcome message
    ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
});

// Broadcast to all connected WebSocket clients
function broadcast(data) {
    console.log(`[WS] Broadcasting to ${wsClients.size} clients: ${data.commandId || data.type}`);
    const message = JSON.stringify(data);
    wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// ============================================================
// TICKTICK API CLIENT
// Auto-loads credentials from ticktick-mcp .env if available
// ============================================================

const TICKTICK_API_BASE = 'https://api.ticktick.com/open/v1';
const TICKTICK_MCP_ENV = path.join(process.env.HOME, 'development/ticktick-mcp/.env');

// Try to load TickTick token from MCP .env file
function loadTickTickToken() {
    // First check environment variable
    if (process.env.TICKTICK_ACCESS_TOKEN) {
        return process.env.TICKTICK_ACCESS_TOKEN;
    }

    // Try to load from ticktick-mcp .env file
    try {
        if (fs.existsSync(TICKTICK_MCP_ENV)) {
            const envContent = fs.readFileSync(TICKTICK_MCP_ENV, 'utf8');
            const match = envContent.match(/TICKTICK_ACCESS_TOKEN=(.+)/);
            if (match) {
                console.log('[TickTick] Loaded token from ticktick-mcp .env');
                return match[1].trim();
            }
        }
    } catch (e) {
        console.error('[TickTick] Error loading token:', e.message);
    }

    return null;
}

const TICKTICK_TOKEN = loadTickTickToken();

async function tickTickRequest(endpoint, method = 'GET', body = null) {
    const token = TICKTICK_TOKEN;

    if (!token) {
        throw new Error('TICKTICK_ACCESS_TOKEN not configured. Set it in your environment.');
    }

    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${TICKTICK_API_BASE}${endpoint}`, options);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TickTick API error ${response.status}: ${errorText}`);
    }

    // Some endpoints return empty response
    const text = await response.text();
    return text ? JSON.parse(text) : { success: true };
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(ROOT_DIR, 'public')));

// Store conversation state
const conversationState = new Map();

// Store active focus sessions (persisted to file for durability)
const FOCUS_SESSIONS_FILE = path.join(ROOT_DIR, '.focus-sessions.json');

function loadFocusSessions() {
    if (fs.existsSync(FOCUS_SESSIONS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(FOCUS_SESSIONS_FILE, 'utf8'));
        } catch (e) {
            return {};
        }
    }
    return {};
}

function saveFocusSessions(sessions) {
    fs.writeFileSync(FOCUS_SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

function getFocusSession(sessionId) {
    const sessions = loadFocusSessions();
    return sessions[sessionId] || null;
}

function updateFocusSession(sessionId, data) {
    const sessions = loadFocusSessions();
    sessions[sessionId] = {
        ...sessions[sessionId],
        ...data,
        lastUpdated: Date.now()
    };
    saveFocusSessions(sessions);
    return sessions[sessionId];
}

function clearFocusSession(sessionId) {
    const sessions = loadFocusSessions();
    delete sessions[sessionId];
    saveFocusSessions(sessions);
}

// Command queue file
const COMMAND_QUEUE = path.join(ROOT_DIR, '.command-queue.json');

// Initialize command queue
if (!fs.existsSync(COMMAND_QUEUE)) {
    fs.writeFileSync(COMMAND_QUEUE, JSON.stringify({ commands: [] }, null, 2));
}

// Project mapping
const PROJECT_IDS = {
    work: '692cc2ab575c11180e5d9df0',
    health: '61e994808f08ba41391df204',
    finances: '61eaa26ade5e11185de999de',
    relationships: '61e997578f08ba41391e29e3',
    hobbies: '61e997ea8f08ba41391e3488',
    maintenance: '620282978f083846135d3c04',
    shopping: '620bd72b8f0824cbd37c5a33',
    someday: '692cfb649dbb511e6fe1e9f3',
    routines: '61e863eb8f08484e9018fa6e',
    forging: '61e992568f08ba41391dc715'
};

// File to store pending commands for Claude to pick up
const PENDING_FILE = path.join(ROOT_DIR, '.pending-commands.json');

function addToCommandQueue(commandData) {
    const queue = JSON.parse(fs.readFileSync(COMMAND_QUEUE, 'utf8'));
    queue.commands.push(commandData);
    fs.writeFileSync(COMMAND_QUEUE, JSON.stringify(queue, null, 2));
    console.log(`[Queue] Added command: ${commandData.id}`);
}

function loadPendingCommands() {
    if (fs.existsSync(PENDING_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
        } catch (e) {
            return {};
        }
    }
    return {};
}

// Store response from Claude
const RESPONSE_FILE = path.join(ROOT_DIR, '.command-responses.json');

function saveResponse(commandId, response) {
    const responses = loadResponses();
    responses[commandId] = {
        response,
        timestamp: Date.now()
    };
    fs.writeFileSync(RESPONSE_FILE, JSON.stringify(responses, null, 2));

    // Broadcast via WebSocket for real-time updates
    broadcast({
        type: 'response',
        commandId,
        response,
        timestamp: Date.now()
    });
}

function loadResponses() {
    if (fs.existsSync(RESPONSE_FILE)) {
        return JSON.parse(fs.readFileSync(RESPONSE_FILE, 'utf8'));
    }
    return {};
}

function getResponse(commandId) {
    const responses = loadResponses();
    if (responses[commandId]) {
        const response = responses[commandId].response;
        delete responses[commandId];
        fs.writeFileSync(RESPONSE_FILE, JSON.stringify(responses, null, 2));
        return response;
    }
    return null;
}

// API Routes
app.post('/api/command', async (req, res) => {
    const { command, sessionId } = req.body;

    if (!sessionId) {
        return res.status(400).json({ error: 'Session ID required' });
    }

    // Get or create session state
    if (!conversationState.has(sessionId)) {
        conversationState.set(sessionId, {
            context: {},
            waitingFor: null
        });
    }

    const session = conversationState.get(sessionId);
    const lowerCommand = command.toLowerCase().trim();

    // Route ALL slash commands through Claude for processing
    const slashCommands = ['/focus', '/morning', '/evening', '/intake', '/stuck', '/now', '/checkin', '/optimize-schedule', '/optimize', '/add'];
    const isSlashCommand = slashCommands.some(cmd => lowerCommand.startsWith(cmd));

    // Also route "what should i be doing" type queries to /now
    const nowPhrases = ['what should i', 'what do i need', 'what\'s next', 'whats next', 'what now'];
    const isNowQuery = nowPhrases.some(phrase => lowerCommand.includes(phrase));

    // Route task-like inputs to /add
    const addPhrases = ['i need to', 'remind me to', 'add task', 'create task', 'new task', 'todo:', 'task:'];
    const isAddQuery = addPhrases.some(phrase => lowerCommand.includes(phrase));

    // Check if there's an active focus session - if so, route through Claude
    const focusSession = getFocusSession(sessionId);
    const hasActiveFocusSession = focusSession && focusSession.active;

    // Handle conversational responses (when Claude is waiting for user input)
    const isConversationalResponse = !isSlashCommand && !isNowQuery && !isAddQuery && session.waitingFor;

    // Route to Claude if: slash command, natural language now query, add query, active focus session response, or conversational response
    if (isSlashCommand || isNowQuery || isAddQuery || hasActiveFocusSession || isConversationalResponse) {
        // Normalize queries to appropriate commands
        let effectiveCommand = command;
        if (isNowQuery && !isSlashCommand) {
            effectiveCommand = '/now ' + command;
        } else if (isAddQuery && !isSlashCommand) {
            effectiveCommand = '/add ' + command;
        }
        const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Add to command queue for Claude Code watcher to process
        addToCommandQueue({
            id: commandId,
            command: isSlashCommand ? lowerCommand : effectiveCommand.toLowerCase(),
            sessionId,
            timestamp: Date.now(),
            fullCommand: command,
            effectiveCommand: effectiveCommand,
            isConversation: isConversationalResponse,
            isNowQuery: isNowQuery,
            isAddQuery: isAddQuery,
            hasActiveFocusSession: hasActiveFocusSession,
            focusSession: focusSession,
            context: session.context || {}
        });

        if (isSlashCommand) {
            console.log(`[Bridge] Added ${lowerCommand} command to queue: ${commandId}`);
        } else if (isNowQuery) {
            console.log(`[Bridge] Added /now query to queue: ${commandId}`);
        } else if (isAddQuery) {
            console.log(`[Bridge] Added /add query to queue: ${commandId}`);
        } else if (hasActiveFocusSession) {
            console.log(`[Bridge] Added focus session response to queue: ${commandId}`);
        } else {
            console.log(`[Bridge] Added conversational response to queue: ${commandId}`);
        }

        // If WebSocket clients are connected, return immediately with commandId
        // Frontend will receive response via WebSocket
        if (wsClients.size > 0) {
            console.log(`[Bridge] WebSocket clients connected (${wsClients.size}), returning commandId`);
            return res.json({
                commandId,
                message: '⏳ Processing...',
                status: 'queued',
                waitingFor: true
            });
        }

        // Fallback: Wait for response (for non-WebSocket clients)
        console.log(`[Bridge] No WebSocket clients, waiting for response...`);
        const timeout = 120000;
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const response = getResponse(commandId);
            if (response) {
                console.log(`[Bridge] Received response from Claude for ${commandId}`);

                // Update session state
                if (response.waitingFor !== undefined) {
                    session.waitingFor = response.waitingFor;
                }
                if (response.context) {
                    session.context = response.context;
                }

                // Update focus session if provided
                if (response.focusSession) {
                    updateFocusSession(sessionId, response.focusSession);
                }
                if (response.clearFocusSession) {
                    clearFocusSession(sessionId);
                }

                return res.json(response);
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        return res.json({
            message: `⏱️ Request timed out. Make sure Claude Code is running.`,
            waitingFor: false
        });
    }

    // Handle other commands normally (non-TickTick commands)
    try {
        const response = await processCommand(command, session);
        res.json(response);
    } catch (error) {
        console.error('Error processing command:', error);
        res.status(500).json({
            error: 'Failed to process command',
            message: error.message
        });
    }
});

// Endpoint for Claude to get pending commands
app.get('/api/pending', (req, res) => {
    const pending = loadPendingCommands();
    res.json({ pending });
});

// Endpoint for Claude to submit responses
app.post('/api/respond', (req, res) => {
    const { commandId, response } = req.body;

    if (!commandId || !response) {
        return res.status(400).json({ error: 'Command ID and response required' });
    }

    saveResponse(commandId, response);
    console.log(`[Bridge] Saved response for command ${commandId}`);

    res.json({ success: true });
});

// Health check
app.get('/api/health', (req, res) => {
    const pending = loadPendingCommands();
    res.json({
        status: 'running',
        pendingCommands: Object.keys(pending).length
    });
});

// Get response by command ID (for polling)
app.get('/api/response/:commandId', (req, res) => {
    const commandId = req.params.commandId;
    const responses = loadResponses();

    if (responses[commandId]) {
        const response = responses[commandId];
        // Don't delete - let the client handle cleanup
        res.json({
            found: true,
            response: response.response,
            timestamp: response.timestamp
        });
    } else {
        res.json({ found: false });
    }
});

// Focus session endpoints
app.get('/api/focus/:sessionId', (req, res) => {
    const session = getFocusSession(req.params.sessionId);
    res.json({ session });
});

app.post('/api/focus/:sessionId', (req, res) => {
    const updated = updateFocusSession(req.params.sessionId, req.body);
    res.json({ session: updated });
});

app.delete('/api/focus/:sessionId', (req, res) => {
    clearFocusSession(req.params.sessionId);
    res.json({ success: true });
});

async function processCommand(command, session) {
    const lowerCommand = command.toLowerCase().trim();

    // Check if we're waiting for a response
    if (session.waitingFor) {
        return await handleWaitingResponse(command, session);
    }

    // Handle other commands (morning, evening, etc.) - simplified versions
    if (lowerCommand === '/morning' || lowerCommand.includes('morning planning')) {
        session.waitingFor = 'morning_priority_1';
        session.context.morningPriorities = [];
        return {
            message: `Good morning! ☀️\n\nLet's set your top 3 priorities for today.\n\nWhat's the most important thing you need to accomplish?`,
            waitingFor: true
        };
    }

    if (lowerCommand === '/evening' || lowerCommand.includes('evening review')) {
        session.waitingFor = 'evening_win';
        session.context.eveningReview = {};
        return {
            message: `Evening review time! 🌙\n\nFirst question: What was your biggest win today?`,
            waitingFor: true
        };
    }

    // Default response
    return {
        message: `Available commands:
• **/now** - What should I be doing? (starts focus coaching)
• **/checkin** - How's it going? (check in on progress)
• **/focus** - Show urgent high/medium priority tasks
• **/morning** - Morning planning routine
• **/evening** - Evening review
• **/intake** - Brain dump mode
• **/stuck** - Get unstuck

Or just ask "What should I be doing right now?" to start focus mode!`,
        waitingFor: false
    };
}

async function handleWaitingResponse(response, session) {
    const waitingFor = session.waitingFor;

    // Morning planning flow
    if (waitingFor === 'morning_priority_1') {
        session.context.morningPriorities.push(response);
        session.waitingFor = 'morning_priority_2';
        return {
            message: `Got it: "${response}"\n\nWhat's the second priority?`,
            waitingFor: true
        };
    }

    if (waitingFor === 'morning_priority_2') {
        session.context.morningPriorities.push(response);
        session.waitingFor = 'morning_priority_3';
        return {
            message: `Good: "${response}"\n\nAnd the third priority?`,
            waitingFor: true
        };
    }

    if (waitingFor === 'morning_priority_3') {
        session.context.morningPriorities.push(response);
        session.waitingFor = null;
        return {
            message: `Perfect! Your top 3 priorities:
1. ${session.context.morningPriorities[0]}
2. ${session.context.morningPriorities[1]}
3. ${session.context.morningPriorities[2]}

Focus on these today. One task at a time! 💪`,
            waitingFor: false
        };
    }

    // Evening review flow
    if (waitingFor === 'evening_win') {
        session.context.eveningReview.win = response;
        session.waitingFor = 'evening_blocker';
        return {
            message: `Awesome! 🎉 "${response}"\n\nWhat got in your way today?`,
            waitingFor: true
        };
    }

    if (waitingFor === 'evening_blocker') {
        session.context.eveningReview.blocker = response;
        session.waitingFor = 'evening_tomorrow';
        return {
            message: `I hear you: "${response}"\n\nWhat's one thing you want to prioritize tomorrow?`,
            waitingFor: true
        };
    }

    if (waitingFor === 'evening_tomorrow') {
        session.context.eveningReview.tomorrow = response;
        session.waitingFor = null;
        return {
            message: `Great review! Summary:
**Win:** ${session.context.eveningReview.win}
**Challenge:** ${session.context.eveningReview.blocker}
**Tomorrow:** ${session.context.eveningReview.tomorrow}

Rest well! 🌙`,
            waitingFor: false
        };
    }

    // Clear waiting state
    session.waitingFor = null;
    return { message: `Got it: "${response}"`, waitingFor: false };
}

// ============================================================
// PROJECT MANAGEMENT API
// ============================================================

const PROJECTS_DIR = path.join(ROOT_DIR, 'data', 'projects');

// Ensure projects directory exists
if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

// Create a new project
app.post('/api/project', async (req, res) => {
    const projectData = req.body;

    if (!projectData.name) {
        return res.status(400).json({ error: 'Project name required' });
    }

    // Generate safe filename
    const safeFileName = projectData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const fileName = `${safeFileName}.md`;
    const filePath = path.join(PROJECTS_DIR, fileName);

    // Create markdown content
    const mdContent = generateProjectMarkdown(projectData);

    // Save project file
    fs.writeFileSync(filePath, mdContent);
    console.log(`[Projects] Created project file: ${fileName}`);

    // Add to command queue for Claude to create TickTick note
    const commandId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    addToCommandQueue({
        id: commandId,
        command: '/create-project-note',
        projectData: projectData,
        projectFile: fileName,
        timestamp: Date.now()
    });

    res.json({
        success: true,
        projectFile: fileName,
        projectPath: filePath,
        commandId: commandId
    });
});

// Get project details
app.get('/api/project/:projectId', (req, res) => {
    const projectId = req.params.projectId;
    const projectsFile = path.join(ROOT_DIR, '.projects-index.json');

    if (fs.existsSync(projectsFile)) {
        const projects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
        const project = projects.find(p => p.id === projectId);
        if (project) {
            return res.json({ project });
        }
    }

    res.status(404).json({ error: 'Project not found' });
});

// Generate tasks for a project
app.post('/api/project/:projectId/generate-tasks', async (req, res) => {
    const projectId = req.params.projectId;
    const { project } = req.body;

    // Add to command queue for Claude to generate tasks
    const commandId = `gentask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    addToCommandQueue({
        id: commandId,
        command: '/generate-project-tasks',
        projectId: projectId,
        project: project,
        timestamp: Date.now()
    });

    console.log(`[Projects] Task generation requested for: ${project?.name || projectId}`);

    // Wait for Claude response (with timeout)
    const timeout = 120000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        const response = getResponse(commandId);
        if (response) {
            return res.json(response);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    res.json({
        message: 'Task generation timed out. Make sure Claude Code is processing commands.',
        tasks: []
    });
});

// Project chat
app.post('/api/project/:projectId/chat', async (req, res) => {
    const projectId = req.params.projectId;
    const { message, project } = req.body;

    // Add to command queue for Claude to process
    const commandId = `projchat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    addToCommandQueue({
        id: commandId,
        command: '/project-chat',
        projectId: projectId,
        message: message,
        project: project,
        timestamp: Date.now()
    });

    console.log(`[Projects] Chat message for project: ${project?.name || projectId}`);

    // Wait for Claude response
    const timeout = 120000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        const response = getResponse(commandId);
        if (response) {
            return res.json(response);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    res.json({
        message: 'Response timed out. Make sure Claude Code is processing commands.'
    });
});

// List all projects
app.get('/api/projects', (req, res) => {
    const projects = [];

    if (fs.existsSync(PROJECTS_DIR)) {
        const files = fs.readdirSync(PROJECTS_DIR).filter(f => f.endsWith('.md'));
        files.forEach(file => {
            const content = fs.readFileSync(path.join(PROJECTS_DIR, file), 'utf8');
            // Extract project name from first line
            const nameMatch = content.match(/^# (.+)$/m);
            projects.push({
                file: file,
                name: nameMatch ? nameMatch[1] : file.replace('.md', '')
            });
        });
    }

    res.json({ projects });
});

// Helper: Generate project markdown
function generateProjectMarkdown(project) {
    const typeEmoji = {
        work: '💻', personal: '🏠', health: '💪',
        learning: '📚', creative: '🎨', financial: '💵'
    };

    let md = `# ${project.name}\n\n`;
    md += `**Type:** ${typeEmoji[project.type] || '📁'} ${project.type || 'General'}\n`;
    md += `**Status:** ${project.status || 'planning'}\n`;
    md += `**Created:** ${new Date().toISOString().split('T')[0]}\n`;

    if (project.deadline) {
        md += `**Deadline:** ${project.deadline} (${project.deadlineType || 'flexible'})\n`;
    }

    md += `\n## Overview\n\n`;
    md += project.description || '_No description provided_';
    md += `\n\n`;

    if (project.successCriteria) {
        md += `## Success Criteria\n\n`;
        md += project.successCriteria;
        md += `\n\n`;
    }

    md += `## Context\n\n`;
    if (project.locations && project.locations.length > 0) {
        md += `**Where:** ${project.locations.join(', ')}\n`;
    }
    if (project.bestTime) {
        md += `**Best Time:** ${project.bestTime}\n`;
    }
    md += `\n`;

    if (project.dependencies) {
        md += `## Dependencies\n\n`;
        md += project.dependencies;
        md += `\n\n`;
    }

    if (project.constraints) {
        md += `## Constraints\n\n`;
        md += project.constraints;
        md += `\n\n`;
    }

    if (project.stakeholders) {
        md += `## Stakeholders\n\n`;
        md += project.stakeholders;
        md += `\n\n`;
    }

    if (project.additionalNotes) {
        md += `## Additional Notes\n\n`;
        md += project.additionalNotes;
        md += `\n\n`;
    }

    md += `## Tasks\n\n`;
    md += `_Tasks will be generated by Claude based on project analysis._\n\n`;

    md += `## Progress Log\n\n`;
    md += `- ${new Date().toISOString().split('T')[0]}: Project created\n`;

    return md;
}

// ============================================================
// TICKTICK API ENDPOINTS (for auto-processor)
// ============================================================

// Get all projects
app.post('/api/ticktick/ticktick_get_projects', async (req, res) => {
    try {
        const projects = await tickTickRequest('/project');
        res.json({ success: true, result: projects });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get tasks in a project
app.post('/api/ticktick/ticktick_get_project_tasks', async (req, res) => {
    try {
        const { project_id } = req.body;
        const data = await tickTickRequest(`/project/${project_id}/data`);
        res.json({ success: true, result: data.tasks || [] });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get engaged tasks (high priority + due today + overdue)
app.post('/api/ticktick/ticktick_get_engaged_tasks', async (req, res) => {
    try {
        // TickTick doesn't have a direct "engaged" endpoint, so we fetch and filter
        const projects = await tickTickRequest('/project');
        const allTasks = [];
        const today = new Date().toISOString().split('T')[0];

        for (const project of projects) {
            try {
                const data = await tickTickRequest(`/project/${project.id}/data`);
                if (data.tasks) {
                    for (const task of data.tasks) {
                        // High priority (5) OR due today OR overdue
                        const isHighPriority = task.priority === 5;
                        const isDueToday = task.dueDate && task.dueDate.startsWith(today);
                        const isOverdue = task.dueDate && task.dueDate < today && task.status === 0;

                        if (isHighPriority || isDueToday || isOverdue) {
                            allTasks.push({
                                ...task,
                                projectName: project.name,
                                projectId: project.id
                            });
                        }
                    }
                }
            } catch (e) {
                // Skip projects that fail
            }
        }

        res.json({ success: true, result: allTasks });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get tasks due today
app.post('/api/ticktick/ticktick_get_tasks_due_today', async (req, res) => {
    try {
        const projects = await tickTickRequest('/project');
        const allTasks = [];
        const today = new Date().toISOString().split('T')[0];

        for (const project of projects) {
            try {
                const data = await tickTickRequest(`/project/${project.id}/data`);
                if (data.tasks) {
                    for (const task of data.tasks) {
                        if (task.dueDate && task.dueDate.startsWith(today) && task.status === 0) {
                            allTasks.push({
                                ...task,
                                projectName: project.name,
                                projectId: project.id
                            });
                        }
                    }
                }
            } catch (e) { }
        }

        res.json({ success: true, result: allTasks });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get overdue tasks
app.post('/api/ticktick/ticktick_get_overdue_tasks', async (req, res) => {
    try {
        const projects = await tickTickRequest('/project');
        const allTasks = [];
        const today = new Date().toISOString().split('T')[0];

        for (const project of projects) {
            try {
                const data = await tickTickRequest(`/project/${project.id}/data`);
                if (data.tasks) {
                    for (const task of data.tasks) {
                        if (task.dueDate && task.dueDate < today && task.status === 0) {
                            allTasks.push({
                                ...task,
                                projectName: project.name,
                                projectId: project.id
                            });
                        }
                    }
                }
            } catch (e) { }
        }

        res.json({ success: true, result: allTasks });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get tasks by priority
app.post('/api/ticktick/ticktick_get_tasks_by_priority', async (req, res) => {
    try {
        const { priority_id } = req.body;
        const projects = await tickTickRequest('/project');
        const allTasks = [];

        for (const project of projects) {
            try {
                const data = await tickTickRequest(`/project/${project.id}/data`);
                if (data.tasks) {
                    for (const task of data.tasks) {
                        if (task.priority === priority_id && task.status === 0) {
                            allTasks.push({
                                ...task,
                                projectName: project.name,
                                projectId: project.id
                            });
                        }
                    }
                }
            } catch (e) { }
        }

        res.json({ success: true, result: allTasks });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Search tasks
app.post('/api/ticktick/ticktick_search_tasks', async (req, res) => {
    try {
        const { search_term } = req.body;
        const lowerSearch = search_term.toLowerCase();
        const projects = await tickTickRequest('/project');
        const allTasks = [];

        for (const project of projects) {
            try {
                const data = await tickTickRequest(`/project/${project.id}/data`);
                if (data.tasks) {
                    for (const task of data.tasks) {
                        const titleMatch = task.title && task.title.toLowerCase().includes(lowerSearch);
                        const contentMatch = task.content && task.content.toLowerCase().includes(lowerSearch);
                        if ((titleMatch || contentMatch) && task.status === 0) {
                            allTasks.push({
                                ...task,
                                projectName: project.name,
                                projectId: project.id
                            });
                        }
                    }
                }
            } catch (e) { }
        }

        res.json({ success: true, result: allTasks });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Create task
app.post('/api/ticktick/ticktick_create_task', async (req, res) => {
    try {
        const { title, project_id, content, start_date, due_date, priority } = req.body;

        const taskData = {
            title,
            projectId: project_id,
            content: content || '',
            priority: priority || 0
        };

        if (start_date) taskData.startDate = start_date;
        if (due_date) taskData.dueDate = due_date;

        const result = await tickTickRequest('/task', 'POST', taskData);
        res.json({ success: true, result });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Update task
app.post('/api/ticktick/ticktick_update_task', async (req, res) => {
    try {
        const { task_id, project_id, title, content, start_date, due_date, priority } = req.body;

        const taskData = { id: task_id, projectId: project_id };
        if (title) taskData.title = title;
        if (content !== undefined) taskData.content = content;
        if (priority !== undefined) taskData.priority = priority;
        if (start_date) taskData.startDate = start_date;
        if (due_date) taskData.dueDate = due_date;

        const result = await tickTickRequest(`/task/${task_id}`, 'POST', taskData);
        res.json({ success: true, result });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Complete task
app.post('/api/ticktick/ticktick_complete_task', async (req, res) => {
    try {
        const { task_id, project_id } = req.body;
        const result = await tickTickRequest(`/project/${project_id}/task/${task_id}/complete`, 'POST');
        res.json({ success: true, result });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Batch create tasks
app.post('/api/ticktick/ticktick_batch_create_tasks', async (req, res) => {
    try {
        const { tasks } = req.body;
        const results = [];

        for (const task of tasks) {
            try {
                const taskData = {
                    title: task.title,
                    projectId: task.project_id,
                    content: task.content || '',
                    priority: task.priority || 0
                };
                if (task.start_date) taskData.startDate = task.start_date;
                if (task.due_date) taskData.dueDate = task.due_date;

                const result = await tickTickRequest('/task', 'POST', taskData);
                results.push({ success: true, task: result });
            } catch (e) {
                results.push({ success: false, error: e.message, title: task.title });
            }
        }

        res.json({ success: true, results });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Create subtask
app.post('/api/ticktick/ticktick_create_subtask', async (req, res) => {
    try {
        const { subtask_title, parent_task_id, project_id, content, priority } = req.body;

        const taskData = {
            title: subtask_title,
            projectId: project_id,
            parentId: parent_task_id,
            content: content || '',
            priority: priority || 0
        };

        const result = await tickTickRequest('/task', 'POST', taskData);
        res.json({ success: true, result });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// ============================================================
// GEMINI AI SCHEDULE REPRIORITIZATION
// ============================================================

const geminiService = require('./services/gemini');
const { buildReprioritizePrompt, parseScheduleResponse } = require('./prompts/schedule-reprioritize');
const aiMemory = require('./services/ai-memory');

// Maximum tasks to send to Gemini to prevent timeout/truncation
const MAX_TASKS_FOR_AI = 15;

/**
 * Prioritize and limit tasks for AI processing
 * Returns { tasksForAI, autoRescheduled }
 */
function prioritizeTasksForAI(tasks, maxTasks = MAX_TASKS_FOR_AI) {
    if (tasks.length <= maxTasks) {
        return { tasksForAI: tasks, autoRescheduled: [] };
    }

    console.log(`[Gemini] Limiting ${tasks.length} tasks to ${maxTasks} for AI processing`);

    // Sort by priority score
    const scored = tasks.map(task => {
        let score = 0;

        // High priority = highest score
        score += (task.priority || 0) * 20;

        // Due today = very high
        const today = new Date().toISOString().split('T')[0];
        if (task.dueDate) {
            const dueDate = task.dueDate.split('T')[0];
            if (dueDate === today) {
                score += 100;
            } else if (dueDate < today) {
                score += 150; // Overdue
            }
        }

        return { ...task, _score: score };
    });

    // Sort by score descending
    scored.sort((a, b) => b._score - a._score);

    // Take top tasks for AI, auto-reschedule the rest
    const tasksForAI = scored.slice(0, maxTasks).map(t => {
        const { _score, ...task } = t;
        return task;
    });

    const autoRescheduled = scored.slice(maxTasks).map(t => ({
        taskId: t.id,
        title: t.title,
        newDate: 'tomorrow',
        reason: 'Auto-rescheduled (lower priority)'
    }));

    console.log(`[Gemini] ${tasksForAI.length} tasks for AI, ${autoRescheduled.length} auto-rescheduled`);

    return { tasksForAI, autoRescheduled };
}

/**
 * Create a fallback response when Gemini fails
 * Uses simple priority-based sorting
 */
function createFallbackResponse(tasks, energyLevel) {
    // Sort by priority (high first) then by due date
    const sortedTasks = [...tasks].sort((a, b) => {
        const priorityDiff = (b.priority || 0) - (a.priority || 0);
        if (priorityDiff !== 0) return priorityDiff;

        // Then by due date
        if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
    });

    // Create schedule based on energy level
    const now = new Date();
    let scheduleHour = now.getHours();
    let scheduleMinute = Math.ceil(now.getMinutes() / 15) * 15; // Round to next 15 min

    if (scheduleMinute >= 60) {
        scheduleMinute = 0;
        scheduleHour++;
    }

    const schedule = [];
    const rescheduled = [];

    // Limit tasks based on energy
    const maxTasks = energyLevel === 'low' ? 2 : energyLevel === 'medium' ? 4 : 6;

    for (let i = 0; i < sortedTasks.length; i++) {
        const task = sortedTasks[i];

        if (i < maxTasks && scheduleHour < 17) {
            // Format time
            const ampm = scheduleHour >= 12 ? 'PM' : 'AM';
            const displayHour = scheduleHour > 12 ? scheduleHour - 12 : scheduleHour || 12;
            const timeStr = `${displayHour}:${scheduleMinute.toString().padStart(2, '0')} ${ampm}`;

            schedule.push({
                taskId: task.id,
                title: task.title,
                scheduledTime: timeStr,
                duration: task.estimatedMinutes || 30,
                priority: task.priority >= 5 ? 'must' : task.priority >= 3 ? 'should' : 'could',
                reason: 'Sorted by priority'
            });

            // Advance time
            scheduleMinute += (task.estimatedMinutes || 30) + 10; // Add buffer
            while (scheduleMinute >= 60) {
                scheduleMinute -= 60;
                scheduleHour++;
            }
        } else {
            // Reschedule remaining tasks
            rescheduled.push({
                taskId: task.id,
                title: task.title,
                newDate: 'tomorrow',
                reason: i >= maxTasks ? 'Too many tasks for today' : 'Past work hours'
            });
        }
    }

    const firstTask = schedule[0];

    return {
        thinking: 'AI response failed, using simple priority sorting as fallback.',
        schedule,
        rescheduled,
        nextAction: firstTask ? {
            taskId: firstTask.taskId,
            title: firstTask.title,
            message: 'Start with your highest priority task!'
        } : null,
        warnings: ['AI scheduling temporarily unavailable - using basic priority sort.'],
        summary: `Sorted ${schedule.length} tasks by priority. ${rescheduled.length} moved to tomorrow.`
    };
}

// POST /api/schedule/reprioritize - Intelligent schedule reprioritization
app.post('/api/schedule/reprioritize', async (req, res) => {
    const startTime = Date.now();

    // Check if Gemini is enabled
    if (!geminiService.isEnabled()) {
        return res.status(503).json({
            success: false,
            error: 'Gemini AI service not configured. Add GEMINI_API_KEY to .env file.',
            fallback: true
        });
    }

    try {
        const {
            tasks = [],
            currentTime = new Date().toISOString(),
            energyLevel = 'medium',
            dayType = 'workday',
            completedToday = [],
            rules = {}
        } = req.body;

        console.log(`[Gemini] Reprioritize request: ${tasks.length} tasks, energy=${energyLevel}`);

        // Update current context in AI memory
        aiMemory.updateContext({
            currentEnergyLevel: energyLevel
        });

        // Limit tasks to prevent Gemini timeout/truncation
        const { tasksForAI, autoRescheduled } = prioritizeTasksForAI(tasks);

        // Build the prompt with limited tasks
        const prompt = buildReprioritizePrompt({
            tasks: tasksForAI,
            currentTime,
            energyLevel,
            dayType,
            completedToday,
            rules
        });

        // Call Gemini with retry logic for JSON failures
        let response;
        let parsed;
        let attempts = 0;
        const maxAttempts = 2;

        while (attempts < maxAttempts) {
            attempts++;
            try {
                console.log(`[Gemini] Attempt ${attempts}/${maxAttempts}`);
                response = await geminiService.generateJSON(prompt, {
                    useCache: attempts === 1, // Only use cache on first attempt
                    retries: 0 // Handle retries at this level
                });
                parsed = parseScheduleResponse(response, tasksForAI);
                break; // Success, exit loop
            } catch (attemptError) {
                console.error(`[Gemini] Attempt ${attempts} failed:`, attemptError.message);

                if (attempts >= maxAttempts) {
                    // All attempts failed, create fallback response
                    console.log('[Gemini] All attempts failed, using fallback response');
                    parsed = createFallbackResponse(tasksForAI, energyLevel);
                }
            }
        }

        // Merge auto-rescheduled tasks with AI-rescheduled tasks
        if (autoRescheduled.length > 0) {
            parsed.rescheduled = [...parsed.rescheduled, ...autoRescheduled];
            if (!parsed.warnings) parsed.warnings = [];
            parsed.warnings.push(`${autoRescheduled.length} lower-priority tasks auto-rescheduled to tomorrow.`);
        }

        const elapsed = Date.now() - startTime;
        console.log(`[Gemini] Reprioritization complete in ${elapsed}ms`);

        // Record this decision in AI memory
        aiMemory.addDecision({
            energyLevel,
            taskCount: tasks.length,
            scheduledCount: parsed.schedule.length,
            rescheduledCount: parsed.rescheduled.length,
            rescheduledTasks: parsed.rescheduled,
            warnings: parsed.warnings,
            thinking: parsed.thinking,
            processingTime: elapsed
        });

        // Update task counts
        aiMemory.incrementScheduled(parsed.schedule.length);
        aiMemory.incrementRescheduled(parsed.rescheduled.length);

        // Check for patterns and add them
        if (parsed.warnings && parsed.warnings.length > 0) {
            // Look for overload warnings
            const overloadWarning = parsed.warnings.find(w =>
                w.toLowerCase().includes('overload') || w.toLowerCase().includes('too many')
            );
            if (overloadWarning) {
                aiMemory.addPattern({
                    type: 'overload',
                    description: 'Schedule overload detected',
                    context: { taskCount: tasks.length, energyLevel }
                });
            }

            // Look for energy mismatch
            const energyWarning = parsed.warnings.find(w =>
                w.toLowerCase().includes('energy') || w.toLowerCase().includes('tired')
            );
            if (energyWarning) {
                aiMemory.addPattern({
                    type: 'energy_mismatch',
                    description: 'Energy level mismatch with tasks',
                    context: { energyLevel, timeOfDay: new Date().getHours() }
                });
            }
        }

        // If many tasks were rescheduled, note this pattern
        if (parsed.rescheduled.length >= 3) {
            aiMemory.addPattern({
                type: 'high_reschedule',
                description: 'Many tasks rescheduled in single session',
                context: {
                    count: parsed.rescheduled.length,
                    reasons: parsed.rescheduled.map(t => t.reason).slice(0, 3)
                }
            });
        }

        res.json({
            success: true,
            ...parsed,
            processingTime: elapsed
        });

    } catch (error) {
        console.error('[Gemini] Reprioritization error:', error.message);

        res.status(500).json({
            success: false,
            error: error.message,
            fallback: true
        });
    }
});

// GET /api/ai-memory - Get AI memory for Claude context
app.get('/api/ai-memory', (req, res) => {
    res.json({
        success: true,
        memory: aiMemory.getMemory()
    });
});

// GET /api/ai-memory/claude-context - Get summarized context for Claude Opus
app.get('/api/ai-memory/claude-context', (req, res) => {
    res.json({
        success: true,
        context: aiMemory.getClaudeContext()
    });
});

// GET /api/ai-memory/stats - Get scheduling stats
app.get('/api/ai-memory/stats', (req, res) => {
    res.json({
        success: true,
        stats: aiMemory.getStats()
    });
});

// GET /api/schedule/reprioritize/status - Check Gemini service status
app.get('/api/schedule/reprioritize/status', (req, res) => {
    res.json({
        enabled: geminiService.isEnabled(),
        model: 'gemini-2.5-flash'
    });
});

// Watch for response file changes (when Claude writes directly via respond.js)
let lastResponseCheck = {};
const responseWatcher = chokidar.watch(RESPONSE_FILE, {
    persistent: true,
    ignoreInitial: true
});

responseWatcher.on('change', () => {
    try {
        const responses = loadResponses();
        // Check for new responses and broadcast them
        Object.entries(responses).forEach(([commandId, data]) => {
            const lastTimestamp = lastResponseCheck[commandId] || 0;
            if (data.timestamp > lastTimestamp) {
                lastResponseCheck[commandId] = data.timestamp;
                broadcast({
                    type: 'response',
                    commandId,
                    response: data.response,
                    timestamp: data.timestamp
                });
                console.log(`[WS] Broadcast response for ${commandId}`);
            }
        });
    } catch (e) {
        // Ignore parse errors during file write
    }
});

// Start server function
function startServer(port = PORT) {
    return new Promise((resolve) => {
        server.listen(port, () => {
            console.log(`\n🧠 Executive Brain Bridge Server`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`✅ HTTP Server: http://localhost:${port}`);
            console.log(`✅ WebSocket:   ws://localhost:${port}`);
            console.log(`\n📋 Architecture:`);
            console.log(`   WebUI ──WebSocket──▶ Bridge ◀──file── Claude Code`);
            console.log(`\n✨ Real-time updates enabled!\n`);
            resolve(server);
        });
    });
}

// Stop server function
function stopServer() {
    return new Promise((resolve) => {
        responseWatcher.close();
        wss.close(() => {
            server.close(() => {
                resolve();
            });
        });
    });
}

// Only start if run directly (not when imported for testing)
if (require.main === module) {
    startServer();
}

// Export for testing
module.exports = {
    app,
    server,
    wss,
    startServer,
    stopServer,
    broadcast,
    // File operations
    addToCommandQueue,
    saveResponse,
    loadResponses,
    getResponse,
    loadPendingCommands,
    // Focus session operations
    getFocusSession,
    updateFocusSession,
    clearFocusSession,
    loadFocusSessions,
    saveFocusSessions,
    // Constants
    COMMAND_QUEUE,
    RESPONSE_FILE,
    FOCUS_SESSIONS_FILE,
    PROJECT_IDS,
    ROOT_DIR
};
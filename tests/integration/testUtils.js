/**
 * Integration test utilities
 * Provides helpers for server setup, file cleanup, and mock data
 */

const fs = require('fs');
const path = require('path');

// Test data directory - use a separate location for test files
const TEST_ROOT = path.join(__dirname, '..', '..', 'test-data');

// Ensure test data directory exists
function setupTestDirectory() {
    if (!fs.existsSync(TEST_ROOT)) {
        fs.mkdirSync(TEST_ROOT, { recursive: true });
    }

    // Create subdirectories
    const dataDir = path.join(TEST_ROOT, 'data');
    const projectsDir = path.join(TEST_ROOT, 'data', 'projects');

    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(projectsDir)) {
        fs.mkdirSync(projectsDir, { recursive: true });
    }
}

// Clean up test files
function cleanupTestFiles() {
    const testFiles = [
        '.command-queue.json',
        '.command-responses.json',
        '.focus-sessions.json',
        '.pending-commands.json',
        '.review-session.json'
    ];

    testFiles.forEach(file => {
        const filePath = path.join(TEST_ROOT, file);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    });
}

// Initialize test command queue
function initCommandQueue() {
    const queuePath = path.join(TEST_ROOT, '.command-queue.json');
    fs.writeFileSync(queuePath, JSON.stringify({ commands: [] }, null, 2));
    return queuePath;
}

// Initialize test response file
function initResponseFile() {
    const responsePath = path.join(TEST_ROOT, '.command-responses.json');
    fs.writeFileSync(responsePath, JSON.stringify({}, null, 2));
    return responsePath;
}

// Read command queue
function readCommandQueue() {
    const queuePath = path.join(TEST_ROOT, '.command-queue.json');
    if (fs.existsSync(queuePath)) {
        return JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    }
    return { commands: [] };
}

// Write to response file
function writeResponse(commandId, response) {
    const responsePath = path.join(TEST_ROOT, '.command-responses.json');
    const responses = fs.existsSync(responsePath)
        ? JSON.parse(fs.readFileSync(responsePath, 'utf8'))
        : {};

    responses[commandId] = {
        response,
        timestamp: Date.now()
    };

    fs.writeFileSync(responsePath, JSON.stringify(responses, null, 2));
}

// Wait for condition with timeout
async function waitFor(conditionFn, timeout = 5000, interval = 100) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        if (await conditionFn()) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error('Timeout waiting for condition');
}

// Mock TickTick API responses
const mockTickTickData = {
    projects: [
        { id: 'proj-1', name: '💻 Work' },
        { id: 'proj-2', name: '💪 Health' },
        { id: 'proj-3', name: '🛍️ Shopping' }
    ],
    tasks: [
        {
            id: 'task-1',
            title: 'Fix login bug',
            priority: 5,
            status: 0,
            projectId: 'proj-1',
            dueDate: new Date().toISOString().split('T')[0]
        },
        {
            id: 'task-2',
            title: 'Write documentation',
            priority: 3,
            status: 0,
            projectId: 'proj-1'
        },
        {
            id: 'task-3',
            title: 'Go to gym',
            priority: 0,
            status: 0,
            projectId: 'proj-2'
        }
    ]
};

// Create mock fetch for TickTick API
function createMockFetch() {
    return jest.fn(async (url, options = {}) => {
        const endpoint = url.replace('https://api.ticktick.com/open/v1', '');

        // GET /project - list all projects
        if (endpoint === '/project' && options.method !== 'POST') {
            return {
                ok: true,
                text: async () => JSON.stringify(mockTickTickData.projects)
            };
        }

        // GET /project/:id/data - get project tasks
        if (endpoint.match(/\/project\/[^/]+\/data$/)) {
            const projectId = endpoint.split('/')[2];
            const tasks = mockTickTickData.tasks.filter(t => t.projectId === projectId);
            return {
                ok: true,
                text: async () => JSON.stringify({ tasks })
            };
        }

        // POST /task - create task
        if (endpoint === '/task' && options.method === 'POST') {
            const body = JSON.parse(options.body);
            const newTask = {
                id: `task-${Date.now()}`,
                ...body
            };
            return {
                ok: true,
                text: async () => JSON.stringify(newTask)
            };
        }

        // POST /task/:id - update task
        if (endpoint.match(/\/task\/[^/]+$/) && options.method === 'POST') {
            const body = JSON.parse(options.body);
            return {
                ok: true,
                text: async () => JSON.stringify({ ...body, updated: true })
            };
        }

        // POST /project/:id/task/:id/complete - complete task
        if (endpoint.match(/\/project\/[^/]+\/task\/[^/]+\/complete$/)) {
            return {
                ok: true,
                text: async () => JSON.stringify({ success: true })
            };
        }

        // Default: return error
        return {
            ok: false,
            status: 404,
            text: async () => 'Not found'
        };
    });
}

// Generate unique session ID for tests
function generateSessionId() {
    return `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate unique command ID for tests
function generateCommandId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
    TEST_ROOT,
    setupTestDirectory,
    cleanupTestFiles,
    initCommandQueue,
    initResponseFile,
    readCommandQueue,
    writeResponse,
    waitFor,
    mockTickTickData,
    createMockFetch,
    generateSessionId,
    generateCommandId
};

/**
 * Integration tests for the Express server API
 * Tests HTTP endpoints without starting the actual server
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Mock chokidar before requiring server
jest.mock('chokidar', () => ({
    watch: jest.fn(() => ({
        on: jest.fn().mockReturnThis(),
        close: jest.fn()
    }))
}));

// Mock the global fetch for TickTick API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

const { app, ROOT_DIR, COMMAND_QUEUE, RESPONSE_FILE, FOCUS_SESSIONS_FILE } = require('../../src/server');

describe('Server API Integration Tests', () => {
    // Clean up files before/after tests
    beforeEach(() => {
        // Reset command queue
        fs.writeFileSync(COMMAND_QUEUE, JSON.stringify({ commands: [] }, null, 2));

        // Reset response file
        fs.writeFileSync(RESPONSE_FILE, JSON.stringify({}, null, 2));

        // Reset focus sessions
        if (fs.existsSync(FOCUS_SESSIONS_FILE)) {
            fs.unlinkSync(FOCUS_SESSIONS_FILE);
        }

        // Reset mocks
        mockFetch.mockReset();
    });

    describe('GET /api/health', () => {
        test('should return running status', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('status', 'running');
            expect(response.body).toHaveProperty('pendingCommands');
        });
    });

    describe('POST /api/command', () => {
        test('should require sessionId', async () => {
            const response = await request(app)
                .post('/api/command')
                .send({ command: '/now' })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Session ID required');
        });

        // Note: This test is timing-sensitive due to server's 120s wait loop for non-WS clients
        // It passes when the processor is running and responds quickly
        test.skip('should accept /now command (requires fast processor)', async () => {
            const sessionId = `session-${Date.now()}-1`;

            const response = await request(app)
                .post('/api/command')
                .send({
                    command: '/now',
                    sessionId
                })
                .timeout(5000);

            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
        }, 10000);

        test('should add /now to command queue', () => {
            // Test the queue mechanism directly without HTTP waiting
            const commandId = 'test-now-direct';
            const { addToCommandQueue } = require('../../src/server');

            addToCommandQueue({
                id: commandId,
                command: '/now',
                sessionId: 'direct-test',
                timestamp: Date.now()
            });

            const queue = JSON.parse(fs.readFileSync(COMMAND_QUEUE, 'utf8'));
            const cmd = queue.commands.find(c => c.id === commandId);
            expect(cmd).toBeDefined();
            expect(cmd.command).toBe('/now');
        });

        test('should add /optimize-schedule to command queue', () => {
            const commandId = 'test-optimize-direct';
            const { addToCommandQueue } = require('../../src/server');

            addToCommandQueue({
                id: commandId,
                command: '/optimize-schedule',
                sessionId: 'optimize-test',
                timestamp: Date.now()
            });

            const queue = JSON.parse(fs.readFileSync(COMMAND_QUEUE, 'utf8'));
            const cmd = queue.commands.find(c => c.id === commandId);
            expect(cmd).toBeDefined();
            expect(cmd.command).toBe('/optimize-schedule');
        });

        test('should add /add to command queue', () => {
            const commandId = 'test-add-direct';
            const { addToCommandQueue } = require('../../src/server');

            addToCommandQueue({
                id: commandId,
                command: '/add Test task',
                sessionId: 'add-test',
                timestamp: Date.now()
            });

            const queue = JSON.parse(fs.readFileSync(COMMAND_QUEUE, 'utf8'));
            const cmd = queue.commands.find(c => c.id === commandId);
            expect(cmd).toBeDefined();
            expect(cmd.command).toBe('/add Test task');
        });

        test('should add natural language query to queue with isNowQuery flag', () => {
            const commandId = 'test-natural-now';
            const { addToCommandQueue } = require('../../src/server');

            addToCommandQueue({
                id: commandId,
                command: '/now What should I be doing?',
                sessionId: 'natural-test',
                isNowQuery: true,
                timestamp: Date.now()
            });

            const queue = JSON.parse(fs.readFileSync(COMMAND_QUEUE, 'utf8'));
            const cmd = queue.commands.find(c => c.id === commandId);
            expect(cmd).toBeDefined();
            expect(cmd.isNowQuery).toBe(true);
        });

        test('should add add query to queue with isAddQuery flag', () => {
            const commandId = 'test-natural-add';
            const { addToCommandQueue } = require('../../src/server');

            addToCommandQueue({
                id: commandId,
                command: '/add remind me to test',
                sessionId: 'add-natural-test',
                isAddQuery: true,
                timestamp: Date.now()
            });

            const queue = JSON.parse(fs.readFileSync(COMMAND_QUEUE, 'utf8'));
            const cmd = queue.commands.find(c => c.id === commandId);
            expect(cmd).toBeDefined();
            expect(cmd.isAddQuery).toBe(true);
        });

        test('should add /morning to command queue', () => {
            const commandId = 'test-morning-direct';
            const { addToCommandQueue } = require('../../src/server');

            addToCommandQueue({
                id: commandId,
                command: '/morning',
                sessionId: 'morning-test',
                timestamp: Date.now()
            });

            const queue = JSON.parse(fs.readFileSync(COMMAND_QUEUE, 'utf8'));
            const cmd = queue.commands.find(c => c.id === commandId);
            expect(cmd).toBeDefined();
            expect(cmd.command).toBe('/morning');
        });
    });

    describe('POST /api/respond', () => {
        test('should require commandId and response', async () => {
            await request(app)
                .post('/api/respond')
                .send({})
                .expect(400);

            await request(app)
                .post('/api/respond')
                .send({ commandId: 'test-123' })
                .expect(400);
        });

        test('should save response', async () => {
            const commandId = 'cmd_test_123';
            const response = {
                message: 'Test response',
                waitingFor: false
            };

            await request(app)
                .post('/api/respond')
                .send({ commandId, response })
                .expect(200);

            const responses = JSON.parse(fs.readFileSync(RESPONSE_FILE, 'utf8'));
            expect(responses[commandId]).toBeDefined();
            expect(responses[commandId].response.message).toBe('Test response');
        });
    });

    describe('GET /api/response/:commandId', () => {
        test('should return found:false when response does not exist', async () => {
            const response = await request(app)
                .get('/api/response/nonexistent-id')
                .expect(200);

            expect(response.body).toHaveProperty('found', false);
        });

        test('should return response when it exists', async () => {
            // First, save a response
            const commandId = 'cmd_test_456';
            const responseData = {
                message: 'Test response data',
                status: 'success'
            };

            const responses = {};
            responses[commandId] = {
                response: responseData,
                timestamp: Date.now()
            };
            fs.writeFileSync(RESPONSE_FILE, JSON.stringify(responses, null, 2));

            // Then retrieve it
            const response = await request(app)
                .get(`/api/response/${commandId}`)
                .expect(200);

            expect(response.body).toHaveProperty('found', true);
            expect(response.body.response.message).toBe('Test response data');
        });
    });

    describe('Focus Session Endpoints', () => {
        test('GET /api/focus/:sessionId should return null for non-existent session', async () => {
            const response = await request(app)
                .get('/api/focus/non-existent-session')
                .expect(200);

            expect(response.body).toHaveProperty('session', null);
        });

        test('POST /api/focus/:sessionId should create/update session', async () => {
            const sessionId = 'focus-test-session';
            const sessionData = {
                active: true,
                state: 'asked_current_activity',
                intendedTask: { title: 'Test task' }
            };

            const response = await request(app)
                .post(`/api/focus/${sessionId}`)
                .send(sessionData)
                .expect(200);

            expect(response.body.session).toHaveProperty('active', true);
            expect(response.body.session).toHaveProperty('lastUpdated');
        });

        test('DELETE /api/focus/:sessionId should clear session', async () => {
            const sessionId = 'focus-delete-session';

            // First create a session
            await request(app)
                .post(`/api/focus/${sessionId}`)
                .send({ active: true });

            // Then delete it
            await request(app)
                .delete(`/api/focus/${sessionId}`)
                .expect(200);

            // Verify it's gone
            const response = await request(app)
                .get(`/api/focus/${sessionId}`)
                .expect(200);

            expect(response.body.session).toBeNull();
        });
    });

    describe('Project Endpoints', () => {
        const projectsDir = path.join(ROOT_DIR, 'data', 'projects');

        beforeEach(() => {
            // Ensure projects directory exists
            if (!fs.existsSync(projectsDir)) {
                fs.mkdirSync(projectsDir, { recursive: true });
            }
        });

        test('POST /api/project should require name', async () => {
            const response = await request(app)
                .post('/api/project')
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Project name required');
        });

        test('POST /api/project should create project file', async () => {
            const response = await request(app)
                .post('/api/project')
                .send({
                    name: 'Test Project',
                    type: 'work',
                    description: 'A test project'
                })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('projectFile', 'test-project.md');

            // Verify file was created
            const projectPath = path.join(projectsDir, 'test-project.md');
            expect(fs.existsSync(projectPath)).toBe(true);

            // Clean up
            fs.unlinkSync(projectPath);
        });

        test('GET /api/projects should list projects', async () => {
            // Create a test project file
            const testProjectPath = path.join(projectsDir, 'list-test.md');
            fs.writeFileSync(testProjectPath, '# List Test Project\n');

            const response = await request(app)
                .get('/api/projects')
                .expect(200);

            expect(response.body).toHaveProperty('projects');
            expect(Array.isArray(response.body.projects)).toBe(true);

            // Clean up
            fs.unlinkSync(testProjectPath);
        });
    });

    describe('TickTick API Proxy Endpoints', () => {
        const mockProjects = [
            { id: 'proj-1', name: 'Work' },
            { id: 'proj-2', name: 'Personal' }
        ];

        const mockTasks = [
            { id: 'task-1', title: 'Task 1', priority: 5, status: 0 },
            { id: 'task-2', title: 'Task 2', priority: 3, status: 0 }
        ];

        beforeEach(() => {
            // Setup mock for TickTick API
            mockFetch.mockImplementation(async (url) => {
                if (url.includes('/project') && !url.includes('/data')) {
                    return {
                        ok: true,
                        text: async () => JSON.stringify(mockProjects)
                    };
                }
                if (url.includes('/data')) {
                    return {
                        ok: true,
                        text: async () => JSON.stringify({ tasks: mockTasks })
                    };
                }
                if (url.includes('/task')) {
                    return {
                        ok: true,
                        text: async () => JSON.stringify({ id: 'new-task', success: true })
                    };
                }
                return { ok: true, text: async () => '{}' };
            });
        });

        test('POST /api/ticktick/ticktick_get_projects should return projects', async () => {
            const response = await request(app)
                .post('/api/ticktick/ticktick_get_projects')
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body.result).toHaveLength(2);
        });

        test('POST /api/ticktick/ticktick_get_project_tasks should return tasks', async () => {
            const response = await request(app)
                .post('/api/ticktick/ticktick_get_project_tasks')
                .send({ project_id: 'proj-1' })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(Array.isArray(response.body.result)).toBe(true);
        });

        test('POST /api/ticktick/ticktick_create_task should create task', async () => {
            const response = await request(app)
                .post('/api/ticktick/ticktick_create_task')
                .send({
                    title: 'New Test Task',
                    project_id: 'proj-1',
                    priority: 3
                })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body.result).toHaveProperty('id');
        });

        test('POST /api/ticktick/ticktick_update_task should update task', async () => {
            mockFetch.mockImplementation(async () => ({
                ok: true,
                text: async () => JSON.stringify({ updated: true })
            }));

            const response = await request(app)
                .post('/api/ticktick/ticktick_update_task')
                .send({
                    task_id: 'task-1',
                    project_id: 'proj-1',
                    title: 'Updated Title'
                })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
        });

        test('POST /api/ticktick/ticktick_complete_task should complete task', async () => {
            mockFetch.mockImplementation(async () => ({
                ok: true,
                text: async () => JSON.stringify({ success: true })
            }));

            const response = await request(app)
                .post('/api/ticktick/ticktick_complete_task')
                .send({
                    task_id: 'task-1',
                    project_id: 'proj-1'
                })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
        });

        test('should handle TickTick API errors gracefully', async () => {
            mockFetch.mockImplementation(async () => ({
                ok: false,
                status: 401,
                text: async () => 'Unauthorized'
            }));

            const response = await request(app)
                .post('/api/ticktick/ticktick_get_projects')
                .expect(200);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Command Routing Logic', () => {
        test('should add command with focus session context to queue', () => {
            const commandId = 'test-focus-routing';
            const { addToCommandQueue } = require('../../src/server');

            const focusSession = {
                active: true,
                state: 'asked_current_activity',
                intendedTask: { title: 'Current task' }
            };

            addToCommandQueue({
                id: commandId,
                command: "I'm working on it",
                sessionId: 'focus-routing-test',
                hasActiveFocusSession: true,
                focusSession: focusSession,
                timestamp: Date.now()
            });

            const queue = JSON.parse(fs.readFileSync(COMMAND_QUEUE, 'utf8'));
            const cmd = queue.commands.find(c => c.id === commandId);
            expect(cmd).toBeDefined();
            expect(cmd.hasActiveFocusSession).toBe(true);
            expect(cmd.focusSession.state).toBe('asked_current_activity');
        });
    });
});

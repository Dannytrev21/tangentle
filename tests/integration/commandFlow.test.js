/**
 * Integration tests for command processing flow
 * Tests file-based communication between components
 */

const fs = require('fs');
const path = require('path');

// Mock chokidar before requiring modules
jest.mock('chokidar', () => ({
    watch: jest.fn(() => ({
        on: jest.fn().mockReturnThis(),
        close: jest.fn()
    }))
}));

// Mock fetch for TickTick API
global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    text: () => Promise.resolve('[]')
}));

const {
    addToCommandQueue,
    saveResponse,
    loadResponses,
    getResponse,
    COMMAND_QUEUE,
    RESPONSE_FILE,
    ROOT_DIR
} = require('../../src/server');

describe('Command Flow Integration Tests', () => {
    beforeEach(() => {
        // Reset command queue
        fs.writeFileSync(COMMAND_QUEUE, JSON.stringify({ commands: [] }, null, 2));

        // Reset response file
        fs.writeFileSync(RESPONSE_FILE, JSON.stringify({}, null, 2));
    });

    describe('Command Queue Operations', () => {
        test('should add command to queue', () => {
            const command = {
                id: 'cmd_test_1',
                command: '/now',
                sessionId: 'test-session',
                timestamp: Date.now()
            };

            addToCommandQueue(command);

            const queue = JSON.parse(fs.readFileSync(COMMAND_QUEUE, 'utf8'));
            expect(queue.commands).toHaveLength(1);
            expect(queue.commands[0].id).toBe('cmd_test_1');
            expect(queue.commands[0].command).toBe('/now');
        });

        test('should append multiple commands to queue', () => {
            addToCommandQueue({ id: 'cmd_1', command: '/now', timestamp: Date.now() });
            addToCommandQueue({ id: 'cmd_2', command: '/morning', timestamp: Date.now() });
            addToCommandQueue({ id: 'cmd_3', command: '/evening', timestamp: Date.now() });

            const queue = JSON.parse(fs.readFileSync(COMMAND_QUEUE, 'utf8'));
            expect(queue.commands).toHaveLength(3);
            expect(queue.commands.map(c => c.id)).toEqual(['cmd_1', 'cmd_2', 'cmd_3']);
        });

        test('should preserve command metadata', () => {
            const command = {
                id: 'cmd_meta_test',
                command: '/add Buy groceries',
                sessionId: 'session-123',
                timestamp: 1234567890,
                fullCommand: 'Buy groceries',
                effectiveCommand: '/add buy groceries',
                isAddQuery: true,
                context: { previousTask: 'some-task' }
            };

            addToCommandQueue(command);

            const queue = JSON.parse(fs.readFileSync(COMMAND_QUEUE, 'utf8'));
            expect(queue.commands[0]).toMatchObject({
                id: 'cmd_meta_test',
                command: '/add Buy groceries',
                sessionId: 'session-123',
                isAddQuery: true,
                context: { previousTask: 'some-task' }
            });
        });
    });

    describe('Response Operations', () => {
        test('should save response to file', () => {
            const commandId = 'cmd_response_test';
            const response = {
                message: 'Test response message',
                waitingFor: false,
                status: 'success'
            };

            saveResponse(commandId, response);

            const responses = JSON.parse(fs.readFileSync(RESPONSE_FILE, 'utf8'));
            expect(responses[commandId]).toBeDefined();
            expect(responses[commandId].response).toEqual(response);
            expect(responses[commandId].timestamp).toBeDefined();
        });

        test('should load responses from file', () => {
            // Manually write responses to file
            const testResponses = {
                'cmd_1': { response: { message: 'Response 1' }, timestamp: 1000 },
                'cmd_2': { response: { message: 'Response 2' }, timestamp: 2000 }
            };
            fs.writeFileSync(RESPONSE_FILE, JSON.stringify(testResponses, null, 2));

            const loaded = loadResponses();
            expect(loaded).toHaveProperty('cmd_1');
            expect(loaded).toHaveProperty('cmd_2');
            expect(loaded.cmd_1.response.message).toBe('Response 1');
        });

        test('should get and remove response', () => {
            // Save a response
            saveResponse('cmd_get_test', {
                message: 'Get test response',
                waitingFor: false
            });

            // Get the response
            const response = getResponse('cmd_get_test');
            expect(response).not.toBeNull();
            expect(response.message).toBe('Get test response');

            // Verify it was removed
            const remaining = loadResponses();
            expect(remaining['cmd_get_test']).toBeUndefined();
        });

        test('should return null for non-existent response', () => {
            const response = getResponse('non_existent_command');
            expect(response).toBeNull();
        });

        test('should handle multiple responses', () => {
            saveResponse('cmd_a', { message: 'A', status: 'success' });
            saveResponse('cmd_b', { message: 'B', status: 'success' });
            saveResponse('cmd_c', { message: 'C', status: 'success' });

            const responses = loadResponses();
            expect(Object.keys(responses)).toHaveLength(3);
        });
    });

    describe('Command-Response Flow', () => {
        test('should simulate complete command-response cycle', () => {
            // 1. Add command to queue (simulating WebUI)
            const commandId = 'cmd_flow_test';
            addToCommandQueue({
                id: commandId,
                command: '/now',
                sessionId: 'flow-session',
                timestamp: Date.now()
            });

            // Verify command is in queue
            let queue = JSON.parse(fs.readFileSync(COMMAND_QUEUE, 'utf8'));
            expect(queue.commands).toHaveLength(1);

            // 2. Simulate processor reading queue
            const command = queue.commands[0];
            expect(command.id).toBe(commandId);
            expect(command.command).toBe('/now');

            // 3. Simulate processor writing response
            saveResponse(commandId, {
                message: '🎯 **What You Should Be Doing**\n\nYour top task...',
                waitingFor: false,
                status: 'success'
            });

            // 4. Verify response is available
            const response = loadResponses()[commandId];
            expect(response).toBeDefined();
            expect(response.response.status).toBe('success');
        });

        test('should handle focus session state in command flow', () => {
            const commandId = 'cmd_focus_flow';
            const focusSession = {
                active: true,
                state: 'asked_current_activity',
                intendedTask: {
                    title: 'Fix login bug',
                    projectName: 'Work',
                    taskId: 'task-123'
                },
                startedAt: Date.now()
            };

            // Add command with focus session context
            addToCommandQueue({
                id: commandId,
                command: "I'm working on it",
                sessionId: 'focus-session',
                hasActiveFocusSession: true,
                focusSession: focusSession,
                timestamp: Date.now()
            });

            // Verify focus session is preserved in queue
            const queue = JSON.parse(fs.readFileSync(COMMAND_QUEUE, 'utf8'));
            expect(queue.commands[0].hasActiveFocusSession).toBe(true);
            expect(queue.commands[0].focusSession.state).toBe('asked_current_activity');
            expect(queue.commands[0].focusSession.intendedTask.title).toBe('Fix login bug');

            // Simulate processor response with updated session state
            saveResponse(commandId, {
                message: '💪 Great! Keep going!',
                waitingFor: true,
                focusSession: {
                    ...focusSession,
                    state: 'working_on_task'
                }
            });

            const response = loadResponses()[commandId];
            expect(response.response.focusSession.state).toBe('working_on_task');
        });

        test('should handle avoidance coaching flow', () => {
            const sessionId = 'avoidance-session';

            // Step 1: Initial /now command
            addToCommandQueue({
                id: 'cmd_avoid_1',
                command: '/now',
                sessionId,
                timestamp: Date.now()
            });

            saveResponse('cmd_avoid_1', {
                message: '🎯 **What should you be doing?**\n\nAre you avoiding it?',
                waitingFor: true,
                focusSession: {
                    active: true,
                    state: 'asked_current_activity',
                    intendedTask: { title: 'Write tests' }
                }
            });

            // Step 2: User says they're avoiding
            addToCommandQueue({
                id: 'cmd_avoid_2',
                command: "I'm avoiding it",
                sessionId,
                hasActiveFocusSession: true,
                focusSession: {
                    active: true,
                    state: 'asked_current_activity'
                },
                timestamp: Date.now()
            });

            saveResponse('cmd_avoid_2', {
                message: "**What's making this hard?**\n\n1️⃣ Too big\n2️⃣ Unclear...",
                waitingFor: true,
                focusSession: {
                    active: true,
                    state: 'exploring_avoidance'
                }
            });

            // Step 3: User selects avoidance type
            addToCommandQueue({
                id: 'cmd_avoid_3',
                command: '1',
                sessionId,
                hasActiveFocusSession: true,
                focusSession: {
                    active: true,
                    state: 'exploring_avoidance'
                },
                timestamp: Date.now()
            });

            saveResponse('cmd_avoid_3', {
                message: '**Strategies for "Too Big"**\n\n1. 2-Minute Version...',
                waitingFor: true,
                focusSession: {
                    active: true,
                    state: 'offering_strategies',
                    avoidanceType: 'too_big'
                }
            });

            // Verify the flow progressed correctly
            const responses = loadResponses();
            expect(Object.keys(responses)).toHaveLength(3);
            expect(responses['cmd_avoid_3'].response.focusSession.avoidanceType).toBe('too_big');
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed response file gracefully', () => {
            // Write invalid JSON
            fs.writeFileSync(RESPONSE_FILE, 'invalid json content');

            // loadResponses should handle this
            expect(() => loadResponses()).toThrow();
        });

        test('should create response file if it does not exist', () => {
            // Delete response file
            if (fs.existsSync(RESPONSE_FILE)) {
                fs.unlinkSync(RESPONSE_FILE);
            }

            // Saving should create the file
            saveResponse('new-file-test', { message: 'Test' });

            expect(fs.existsSync(RESPONSE_FILE)).toBe(true);
            const responses = loadResponses();
            expect(responses['new-file-test']).toBeDefined();
        });
    });

    describe('Command Queue Format', () => {
        test('should maintain correct queue structure', () => {
            addToCommandQueue({
                id: 'cmd_struct_1',
                command: '/morning',
                sessionId: 'struct-session',
                timestamp: Date.now(),
                fullCommand: '/morning',
                context: {}
            });

            const queue = JSON.parse(fs.readFileSync(COMMAND_QUEUE, 'utf8'));

            // Verify queue structure
            expect(queue).toHaveProperty('commands');
            expect(Array.isArray(queue.commands)).toBe(true);

            // Verify command structure
            const cmd = queue.commands[0];
            expect(cmd).toHaveProperty('id');
            expect(cmd).toHaveProperty('command');
            expect(cmd).toHaveProperty('sessionId');
            expect(cmd).toHaveProperty('timestamp');
        });
    });

    describe('Response Format', () => {
        test('should maintain correct response structure', () => {
            saveResponse('cmd_response_struct', {
                message: 'Formatted message',
                waitingFor: true,
                status: 'waiting',
                focusSession: {
                    active: true,
                    state: 'asked_current_activity'
                }
            });

            const responses = loadResponses();
            const resp = responses['cmd_response_struct'];

            // Verify response structure
            expect(resp).toHaveProperty('response');
            expect(resp).toHaveProperty('timestamp');
            expect(typeof resp.timestamp).toBe('number');

            // Verify response content structure
            expect(resp.response).toHaveProperty('message');
            expect(resp.response).toHaveProperty('waitingFor');
            expect(resp.response).toHaveProperty('status');
        });
    });
});

/**
 * Integration tests for WebSocket functionality
 * Tests real-time response broadcasting
 */

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

// Mock chokidar before requiring server
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
    app,
    startServer,
    stopServer,
    broadcast,
    saveResponse,
    RESPONSE_FILE,
    COMMAND_QUEUE
} = require('../../src/server');

describe('WebSocket Integration Tests', () => {
    let server;
    const TEST_PORT = 3099;

    beforeAll(async () => {
        // Start server on test port
        server = await startServer(TEST_PORT);
    });

    afterAll(async () => {
        // Stop server
        await stopServer();
    });

    beforeEach(() => {
        // Reset files
        fs.writeFileSync(COMMAND_QUEUE, JSON.stringify({ commands: [] }, null, 2));
        fs.writeFileSync(RESPONSE_FILE, JSON.stringify({}, null, 2));
    });

    describe('Connection', () => {
        test('should accept WebSocket connections', (done) => {
            const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

            ws.on('open', () => {
                expect(ws.readyState).toBe(WebSocket.OPEN);
                ws.close();
                done();
            });

            ws.on('error', (err) => {
                done(err);
            });
        });

        test('should send connected message on connection', (done) => {
            const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                expect(message).toHaveProperty('type', 'connected');
                expect(message).toHaveProperty('timestamp');
                ws.close();
                done();
            });

            ws.on('error', (err) => {
                done(err);
            });
        });
    });

    describe('Broadcasting', () => {
        test('should broadcast response to connected client', (done) => {
            const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
            let receivedConnected = false;

            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());

                if (message.type === 'connected') {
                    receivedConnected = true;
                    // Now broadcast a test response
                    setTimeout(() => {
                        broadcast({
                            type: 'response',
                            commandId: 'test-broadcast-123',
                            response: { message: 'Test broadcast message' },
                            timestamp: Date.now()
                        });
                    }, 100);
                } else if (message.type === 'response') {
                    expect(receivedConnected).toBe(true);
                    expect(message.commandId).toBe('test-broadcast-123');
                    expect(message.response.message).toBe('Test broadcast message');
                    ws.close();
                    done();
                }
            });

            ws.on('error', (err) => {
                done(err);
            });
        });

        test('should broadcast to multiple clients', (done) => {
            const clients = [];
            const receivedMessages = new Map();
            const EXPECTED_CLIENTS = 3;
            let connectedCount = 0;

            // Create multiple clients
            for (let i = 0; i < EXPECTED_CLIENTS; i++) {
                const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
                clients.push(ws);
                receivedMessages.set(i, []);

                ws.on('message', (data) => {
                    const message = JSON.parse(data.toString());
                    receivedMessages.get(i).push(message);

                    if (message.type === 'connected') {
                        connectedCount++;
                        if (connectedCount === EXPECTED_CLIENTS) {
                            // All connected, broadcast a message
                            setTimeout(() => {
                                broadcast({
                                    type: 'response',
                                    commandId: 'multi-client-test',
                                    response: { message: 'Multi-client broadcast' },
                                    timestamp: Date.now()
                                });
                            }, 100);
                        }
                    }

                    if (message.type === 'response') {
                        // Check if all clients received the broadcast
                        const allReceived = Array.from(receivedMessages.values()).every(
                            msgs => msgs.some(m => m.type === 'response' && m.commandId === 'multi-client-test')
                        );

                        if (allReceived) {
                            // Close all clients
                            clients.forEach(client => client.close());
                            done();
                        }
                    }
                });

                ws.on('error', (err) => {
                    done(err);
                });
            }
        });
    });

    describe('Response Broadcasting via saveResponse', () => {
        test('should broadcast when saveResponse is called', (done) => {
            const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
            let receivedConnected = false;

            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());

                if (message.type === 'connected') {
                    receivedConnected = true;
                    // Save a response which should trigger broadcast
                    setTimeout(() => {
                        saveResponse('save-response-test', {
                            message: 'Response saved and broadcast',
                            status: 'success'
                        });
                    }, 100);
                } else if (message.type === 'response') {
                    expect(receivedConnected).toBe(true);
                    expect(message.commandId).toBe('save-response-test');
                    expect(message.response.message).toBe('Response saved and broadcast');
                    ws.close();
                    done();
                }
            });

            ws.on('error', (err) => {
                done(err);
            });
        });
    });

    describe('Disconnection Handling', () => {
        test('should handle client disconnection gracefully', (done) => {
            const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

            ws.on('open', () => {
                // Close immediately
                ws.close();
            });

            ws.on('close', () => {
                // Should not throw errors when broadcasting after disconnect
                expect(() => {
                    broadcast({
                        type: 'response',
                        commandId: 'post-disconnect',
                        response: { message: 'After disconnect' }
                    });
                }).not.toThrow();
                done();
            });

            ws.on('error', (err) => {
                done(err);
            });
        });

        test('should continue broadcasting to remaining clients after one disconnects', (done) => {
            const ws1 = new WebSocket(`ws://localhost:${TEST_PORT}`);
            const ws2 = new WebSocket(`ws://localhost:${TEST_PORT}`);
            let ws1Connected = false;
            let ws2Connected = false;
            let ws1Closed = false;

            ws1.on('message', (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === 'connected') {
                    ws1Connected = true;
                    if (ws2Connected) {
                        // Close ws1 and then broadcast
                        ws1.close();
                    }
                }
            });

            ws1.on('close', () => {
                ws1Closed = true;
                // Wait a bit then broadcast
                setTimeout(() => {
                    broadcast({
                        type: 'response',
                        commandId: 'after-partial-disconnect',
                        response: { message: 'Partial disconnect test' }
                    });
                }, 100);
            });

            ws2.on('message', (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === 'connected') {
                    ws2Connected = true;
                    if (ws1Connected) {
                        ws1.close();
                    }
                } else if (message.type === 'response') {
                    expect(ws1Closed).toBe(true);
                    expect(message.commandId).toBe('after-partial-disconnect');
                    ws2.close();
                    done();
                }
            });

            ws1.on('error', (err) => done(err));
            ws2.on('error', (err) => done(err));
        });
    });

    describe('Message Format', () => {
        test('should broadcast properly formatted response messages', (done) => {
            const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());

                if (message.type === 'connected') {
                    broadcast({
                        type: 'response',
                        commandId: 'format-test',
                        response: {
                            message: '🎯 **Test Message**\n\nWith markdown',
                            waitingFor: false,
                            status: 'success'
                        },
                        timestamp: Date.now()
                    });
                } else if (message.type === 'response') {
                    // Verify message structure
                    expect(message).toHaveProperty('type', 'response');
                    expect(message).toHaveProperty('commandId', 'format-test');
                    expect(message).toHaveProperty('response');
                    expect(message).toHaveProperty('timestamp');
                    expect(message.response).toHaveProperty('message');
                    expect(message.response).toHaveProperty('waitingFor', false);
                    expect(message.response).toHaveProperty('status', 'success');
                    ws.close();
                    done();
                }
            });

            ws.on('error', (err) => done(err));
        });
    });
});

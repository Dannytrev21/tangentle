/**
 * Unit tests for strategy management functions
 * These tests require fs mocking since they read/write to files
 */

const fs = require('fs');
const path = require('path');

// Mock fs module before requiring processor
jest.mock('fs');

const {
    loadMemories,
    saveMemories,
    getStrategiesForAvoidance,
    recordStrategyOutcome,
    addCustomStrategy,
    formatStrategiesForDisplay,
    formatAvoidanceOptions,
    AVOIDANCE_TYPES
} = require('../../src/processor');

describe('Strategy Management', () => {
    // Sample memories data
    const sampleMemories = {
        strategies: [
            {
                id: '2-minute-version',
                name: '2-Minute Version',
                description: 'Just do 2 minutes to build momentum',
                applicableTo: ['too_big', 'scary'],
                score: 8,
                outcomes: [
                    { date: '2025-12-01', result: 'success', taskContext: 'Test task' }
                ],
                tweaks: []
            },
            {
                id: 'first-step-only',
                name: 'First Step Only',
                description: 'Focus only on the very first action',
                applicableTo: ['too_big', 'unclear'],
                score: 5,
                outcomes: [],
                tweaks: []
            },
            {
                id: 'permission-to-suck',
                name: 'Permission to Suck',
                description: 'Do it badly, done is better than perfect',
                applicableTo: ['scary', 'boring'],
                score: 2,
                outcomes: [],
                tweaks: []
            },
            {
                id: 'body-doubling',
                name: 'Body Doubling',
                description: 'Work alongside someone else',
                applicableTo: ['boring', 'distracted'],
                score: 3,
                outcomes: [],
                tweaks: []
            }
        ],
        taskHistory: {
            'task-123': {
                title: 'Test Task',
                strategiesAttempted: [
                    { strategyId: '2-minute-version', date: '2025-12-01', result: 'failure', avoidanceType: 'too_big' }
                ]
            }
        },
        reviewSessions: []
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock implementations
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(JSON.stringify(sampleMemories));
        fs.writeFileSync.mockImplementation(() => {});
    });

    describe('loadMemories', () => {
        test('should return default structure when file does not exist', () => {
            fs.existsSync.mockReturnValue(false);

            const memories = loadMemories();

            expect(memories).toEqual({
                strategies: [],
                taskHistory: {},
                reviewSessions: []
            });
        });

        test('should load and parse memories from file', () => {
            const memories = loadMemories();

            expect(memories.strategies).toHaveLength(4);
            expect(memories.strategies[0].id).toBe('2-minute-version');
        });

        test('should return default structure on parse error', () => {
            fs.readFileSync.mockReturnValue('invalid json');

            const memories = loadMemories();

            expect(memories).toEqual({
                strategies: [],
                taskHistory: {},
                reviewSessions: []
            });
        });
    });

    describe('saveMemories', () => {
        test('should write memories to file with lastUpdated', () => {
            const memories = { strategies: [], taskHistory: {} };

            saveMemories(memories);

            expect(fs.writeFileSync).toHaveBeenCalled();
            const writtenData = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
            expect(writtenData).toHaveProperty('lastUpdated');
        });
    });

    describe('getStrategiesForAvoidance', () => {
        test('should filter strategies by avoidance type', () => {
            const result = getStrategiesForAvoidance('too_big');

            expect(result.strategies).toHaveLength(2);
            expect(result.strategies.map(s => s.id)).toContain('2-minute-version');
            expect(result.strategies.map(s => s.id)).toContain('first-step-only');
        });

        test('should sort strategies by score (highest first)', () => {
            const result = getStrategiesForAvoidance('too_big');

            expect(result.strategies[0].score).toBeGreaterThanOrEqual(result.strategies[1].score);
        });

        test('should identify failed strategies for a task', () => {
            const result = getStrategiesForAvoidance('too_big', 'task-123');

            expect(result.failedStrategies).toContain('2-minute-version');
        });

        test('should deprioritize failed strategies', () => {
            const result = getStrategiesForAvoidance('too_big', 'task-123');

            // Failed strategy should be last even if it has highest score
            const failedIndex = result.strategies.findIndex(s => s.id === '2-minute-version');
            const otherIndex = result.strategies.findIndex(s => s.id === 'first-step-only');
            expect(failedIndex).toBeGreaterThan(otherIndex);
        });

        test('should return empty array for non-matching avoidance type', () => {
            const result = getStrategiesForAvoidance('interruptions');

            expect(result.strategies).toHaveLength(0);
        });

        test('should return task history when taskId provided', () => {
            const result = getStrategiesForAvoidance('too_big', 'task-123');

            expect(result.taskHistory).toHaveProperty('strategiesAttempted');
        });
    });

    describe('recordStrategyOutcome', () => {
        test('should update strategy score for success (+3)', () => {
            recordStrategyOutcome('2-minute-version', 'task-456', 'Test Task', 'too_big', 'success', 'It worked!');

            expect(fs.writeFileSync).toHaveBeenCalled();
            const writtenData = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
            const strategy = writtenData.strategies.find(s => s.id === '2-minute-version');
            expect(strategy.score).toBe(11); // 8 + 3
        });

        test('should update strategy score for partial (+1)', () => {
            recordStrategyOutcome('2-minute-version', 'task-456', 'Test Task', 'too_big', 'partial');

            const writtenData = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
            const strategy = writtenData.strategies.find(s => s.id === '2-minute-version');
            expect(strategy.score).toBe(9); // 8 + 1
        });

        test('should update strategy score for failure (-1)', () => {
            recordStrategyOutcome('2-minute-version', 'task-456', 'Test Task', 'too_big', 'failure');

            const writtenData = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
            const strategy = writtenData.strategies.find(s => s.id === '2-minute-version');
            expect(strategy.score).toBe(7); // 8 - 1
        });

        test('should add outcome to strategy outcomes array', () => {
            recordStrategyOutcome('2-minute-version', 'task-456', 'New Task', 'too_big', 'success', 'Notes here');

            const writtenData = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
            const strategy = writtenData.strategies.find(s => s.id === '2-minute-version');
            const latestOutcome = strategy.outcomes[strategy.outcomes.length - 1];

            expect(latestOutcome.result).toBe('success');
            expect(latestOutcome.taskContext).toBe('New Task');
            expect(latestOutcome.taskId).toBe('task-456');
            expect(latestOutcome.notes).toBe('Notes here');
        });

        test('should update task history with strategy attempt', () => {
            recordStrategyOutcome('first-step-only', 'task-789', 'Another Task', 'unclear', 'success');

            const writtenData = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
            expect(writtenData.taskHistory['task-789']).toBeDefined();
            expect(writtenData.taskHistory['task-789'].title).toBe('Another Task');
            expect(writtenData.taskHistory['task-789'].strategiesAttempted).toHaveLength(1);
        });

        test('should limit outcomes to last 50 per strategy', () => {
            // Create memories with 50 existing outcomes
            const manyOutcomesMemories = {
                ...sampleMemories,
                strategies: [{
                    ...sampleMemories.strategies[0],
                    outcomes: Array(50).fill({ date: '2025-01-01', result: 'success', taskContext: 'Old task' })
                }]
            };
            fs.readFileSync.mockReturnValue(JSON.stringify(manyOutcomesMemories));

            recordStrategyOutcome('2-minute-version', 'task-new', 'New Task', 'too_big', 'success');

            const writtenData = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
            const strategy = writtenData.strategies.find(s => s.id === '2-minute-version');
            expect(strategy.outcomes).toHaveLength(50);
        });
    });

    describe('addCustomStrategy', () => {
        test('should create new custom strategy', () => {
            const result = addCustomStrategy(
                'My Custom Strategy',
                'Do something unique',
                ['too_big', 'boring']
            );

            expect(result).not.toBeNull();
            expect(result.id).toBe('my-custom-strategy');
            expect(result.name).toBe('My Custom Strategy');
            expect(result.isCustom).toBe(true);
            expect(result.score).toBe(0);
        });

        test('should return null if strategy already exists', () => {
            const result = addCustomStrategy(
                '2-Minute Version', // Already exists
                'Duplicate',
                ['too_big']
            );

            expect(result).toBeNull();
        });

        test('should save new strategy to memories', () => {
            addCustomStrategy('New Strategy', 'Description', ['scary']);

            expect(fs.writeFileSync).toHaveBeenCalled();
            const writtenData = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
            const newStrategy = writtenData.strategies.find(s => s.id === 'new-strategy');
            expect(newStrategy).toBeDefined();
        });

        test('should generate valid id from name', () => {
            const result = addCustomStrategy(
                'Strategy With Spaces & Special!Chars',
                'Description',
                ['too_big']
            );

            expect(result.id).toBe('strategy-with-spaces-special-chars');
        });
    });

    describe('formatStrategiesForDisplay', () => {
        test('should format strategies with numbers', () => {
            const strategies = [
                { id: 'test', name: 'Test Strategy', description: 'Test description', score: 5 }
            ];

            const result = formatStrategiesForDisplay(strategies);

            expect(result).toContain('**1.**');
            expect(result).toContain('Test Strategy');
            expect(result).toContain('Test description');
        });

        test('should show star indicator for high scores (>5)', () => {
            const strategies = [
                { id: 'test', name: 'High Score', description: 'Test', score: 10 }
            ];

            const result = formatStrategiesForDisplay(strategies);

            expect(result).toContain('⭐');
        });

        test('should show checkmark for positive scores (1-5)', () => {
            const strategies = [
                { id: 'test', name: 'Medium Score', description: 'Test', score: 3 }
            ];

            const result = formatStrategiesForDisplay(strategies);

            expect(result).toContain('✓');
        });

        test('should show warning for previously failed strategies', () => {
            const strategies = [
                { id: 'failed-one', name: 'Failed Strategy', description: 'Test', score: 2 }
            ];
            const failedStrategies = ['failed-one'];

            const result = formatStrategiesForDisplay(strategies, failedStrategies);

            expect(result).toContain('⚠️');
            expect(result).toContain('tried before');
        });

        test('should limit to 5 strategies', () => {
            const strategies = Array(10).fill(null).map((_, i) => ({
                id: `strategy-${i}`,
                name: `Strategy ${i}`,
                description: 'Test',
                score: i
            }));

            const result = formatStrategiesForDisplay(strategies);

            expect(result).toContain('**1.**');
            expect(result).toContain('**5.**');
            expect(result).not.toContain('**6.**');
        });
    });

    describe('formatAvoidanceOptions', () => {
        test('should include all avoidance types', () => {
            const result = formatAvoidanceOptions();

            Object.values(AVOIDANCE_TYPES).forEach(type => {
                expect(result).toContain(type.label);
            });
        });

        test('should number options from 1 to 11', () => {
            const result = formatAvoidanceOptions();

            for (let i = 1; i <= 11; i++) {
                expect(result).toContain(`**${i}.**`);
            }
        });

        test('should include descriptions', () => {
            const result = formatAvoidanceOptions();

            expect(result).toContain('overwhelming');
            expect(result).toContain('tedious');
        });
    });
});

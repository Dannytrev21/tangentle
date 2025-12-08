/**
 * Unit tests for pure utility functions in processor.js
 * These functions have no side effects and don't require mocking
 */

const {
    parseAvoidanceInput,
    detectProject,
    estimateTaskSize,
    getCurrentMinutes,
    isWeekend,
    isTodayWeekend,
    getNextWorkday,
    daysUntilNextWorkday,
    formatTime,
    formatTask,
    AVOIDANCE_TYPES,
    PROJECT_KEYWORDS,
    DAY_STRUCTURE
} = require('../../src/processor');

describe('parseAvoidanceInput', () => {
    describe('number inputs (1-11)', () => {
        test('should return "too_big" for input 1', () => {
            expect(parseAvoidanceInput('1')).toBe('too_big');
        });

        test('should return "unclear" for input 2', () => {
            expect(parseAvoidanceInput('2')).toBe('unclear');
        });

        test('should return "boring" for input 3', () => {
            expect(parseAvoidanceInput('3')).toBe('boring');
        });

        test('should return "scary" for input 4', () => {
            expect(parseAvoidanceInput('4')).toBe('scary');
        });

        test('should return "blocked" for input 5', () => {
            expect(parseAvoidanceInput('5')).toBe('blocked');
        });

        test('should return "distracted" for input 6', () => {
            expect(parseAvoidanceInput('6')).toBe('distracted');
        });

        test('should return "low_energy" for input 7', () => {
            expect(parseAvoidanceInput('7')).toBe('low_energy');
        });

        test('should return "overwhelmed" for input 8', () => {
            expect(parseAvoidanceInput('8')).toBe('overwhelmed');
        });

        test('should return "forgot" for input 9', () => {
            expect(parseAvoidanceInput('9')).toBe('forgot');
        });

        test('should return "interruptions" for input 10', () => {
            expect(parseAvoidanceInput('10')).toBe('interruptions');
        });

        test('should return "other" for input 11', () => {
            expect(parseAvoidanceInput('11')).toBe('other');
        });
    });

    describe('keyword inputs', () => {
        test('should detect "big" as too_big', () => {
            expect(parseAvoidanceInput('It feels too big')).toBe('too_big');
        });

        test('should detect "overwhelming" as too_big', () => {
            expect(parseAvoidanceInput('overwhelming task')).toBe('too_big');
        });

        test('should detect "confusing" as unclear', () => {
            expect(parseAvoidanceInput('confusing requirements')).toBe('unclear');
        });

        test('should detect "boring" as boring', () => {
            expect(parseAvoidanceInput('so boring')).toBe('boring');
        });

        test('should detect "tedious" as boring', () => {
            expect(parseAvoidanceInput('tedious work')).toBe('boring');
        });

        test('should detect "scared" as scary', () => {
            expect(parseAvoidanceInput('I am scared')).toBe('scary');
        });

        test('should detect "afraid" as scary', () => {
            expect(parseAvoidanceInput('afraid of failing')).toBe('scary');
        });

        test('should detect "fail" as scary', () => {
            expect(parseAvoidanceInput('might fail')).toBe('scary');
        });

        test('should detect "blocked" as blocked', () => {
            expect(parseAvoidanceInput('blocked by dependency')).toBe('blocked');
        });

        test('should detect "waiting" as blocked', () => {
            expect(parseAvoidanceInput('waiting for review')).toBe('blocked');
        });

        test('should detect "distracted" as distracted', () => {
            expect(parseAvoidanceInput('got distracted')).toBe('distracted');
        });

        test('should detect "social media" as distracted', () => {
            expect(parseAvoidanceInput('social media')).toBe('distracted');
        });

        test('should detect "phone" as distracted', () => {
            expect(parseAvoidanceInput('kept checking phone')).toBe('distracted');
        });

        test('should detect "tired" as low_energy', () => {
            expect(parseAvoidanceInput('too tired')).toBe('low_energy');
        });

        test('should detect "exhausted" as low_energy', () => {
            expect(parseAvoidanceInput('exhausted today')).toBe('low_energy');
        });

        test('should detect "too many" as overwhelmed', () => {
            expect(parseAvoidanceInput('too many things')).toBe('overwhelmed');
        });

        test('should detect "forgot" as forgot', () => {
            expect(parseAvoidanceInput('I forgot about it')).toBe('forgot');
        });

        test('should detect "interrupted" as interruptions', () => {
            expect(parseAvoidanceInput('kept getting interrupted')).toBe('interruptions');
        });

        test('should return "other" for unrecognized input', () => {
            expect(parseAvoidanceInput('random text')).toBe('other');
        });
    });

    describe('case insensitivity', () => {
        test('should handle uppercase input', () => {
            expect(parseAvoidanceInput('TOO BIG')).toBe('too_big');
        });

        test('should handle mixed case input', () => {
            expect(parseAvoidanceInput('Boring')).toBe('boring');
        });
    });

    describe('whitespace handling', () => {
        test('should trim whitespace', () => {
            expect(parseAvoidanceInput('  1  ')).toBe('too_big');
        });
    });
});

describe('detectProject', () => {
    test('should detect work-related keywords', () => {
        expect(detectProject('fix the login bug')).toEqual(expect.objectContaining({
            projectId: '692cc2ab575c11180e5d9df0',
            name: '💻 Work'
        }));
    });

    test('should detect health keywords', () => {
        expect(detectProject('go to the doctor')).toEqual(expect.objectContaining({
            projectId: '61e994808f08ba41391df204',
            name: '💪 Health'
        }));
    });

    test('should detect shopping keywords', () => {
        expect(detectProject('buy groceries')).toEqual(expect.objectContaining({
            projectId: '620bd72b8f0824cbd37c5a33',
            name: '🛍️ Shopping'
        }));
    });

    test('should detect cleaning keywords', () => {
        expect(detectProject('clean the kitchen')).toEqual(expect.objectContaining({
            projectId: '61f800e78f08384612258479',
            name: '🍋 Cleaning'
        }));
    });

    test('should detect maintenance keywords', () => {
        expect(detectProject('fix the leaky faucet')).toEqual(expect.objectContaining({
            projectId: '620282978f083846135d3c04',
            name: '🔧 Maintenance'
        }));
    });

    test('should detect relationship keywords', () => {
        expect(detectProject('call mom')).toEqual(expect.objectContaining({
            projectId: '61e997578f08ba41391e29e3',
            name: '👫 Relationships'
        }));
    });

    test('should detect hobby keywords', () => {
        expect(detectProject('read a book')).toEqual(expect.objectContaining({
            projectId: '61e997ea8f08ba41391e3488',
            name: '🧗🏻 Hobbies'
        }));
    });

    test('should detect finance keywords', () => {
        expect(detectProject('pay electricity bill')).toEqual(expect.objectContaining({
            projectId: '61eaa26ade5e11185de999de',
            name: '💵 Finances'
        }));
    });

    test('should detect someday-maybe keywords', () => {
        expect(detectProject('someday learn piano')).toEqual(expect.objectContaining({
            projectId: '692cfb649dbb511e6fe1e9f3',
            name: '❓ Someday-Maybe'
        }));
    });

    test('should default to Work for unrecognized text', () => {
        expect(detectProject('random task')).toEqual(expect.objectContaining({
            projectId: '692cc2ab575c11180e5d9df0',
            name: '💻 Work'
        }));
    });

    test('should be case insensitive', () => {
        expect(detectProject('BUY SOMETHING')).toEqual(expect.objectContaining({
            projectId: '620bd72b8f0824cbd37c5a33'
        }));
    });
});

describe('estimateTaskSize', () => {
    test('should detect "finish" as big task', () => {
        expect(estimateTaskSize('Finish the report')).toBe(true);
    });

    test('should detect "complete" as big task', () => {
        expect(estimateTaskSize('Complete the project')).toBe(true);
    });

    test('should detect "build" as big task', () => {
        expect(estimateTaskSize('Build the new feature')).toBe(true);
    });

    test('should detect "implement" as big task', () => {
        expect(estimateTaskSize('Implement authentication')).toBe(true);
    });

    test('should detect "design" as big task', () => {
        expect(estimateTaskSize('Design the API')).toBe(true);
    });

    test('should detect "write" as big task', () => {
        expect(estimateTaskSize('Write documentation')).toBe(true);
    });

    test('should detect "setup" as big task', () => {
        expect(estimateTaskSize('Setup the environment')).toBe(true);
    });

    test('should detect "set up" as big task', () => {
        expect(estimateTaskSize('Set up CI/CD')).toBe(true);
    });

    test('should detect "migrate" as big task', () => {
        expect(estimateTaskSize('Migrate database')).toBe(true);
    });

    test('should detect "refactor" as big task', () => {
        expect(estimateTaskSize('Refactor the code')).toBe(true);
    });

    test('should detect "plan" as big task', () => {
        expect(estimateTaskSize('Plan the sprint')).toBe(true);
    });

    test('should detect "research" as big task', () => {
        expect(estimateTaskSize('Research options')).toBe(true);
    });

    test('should return false for simple tasks', () => {
        expect(estimateTaskSize('Send email')).toBe(false);
    });

    test('should return false for quick tasks', () => {
        expect(estimateTaskSize('Review PR')).toBe(false);
    });

    test('should be case insensitive', () => {
        expect(estimateTaskSize('FINISH the report')).toBe(true);
    });
});

describe('Date/Time utilities', () => {
    describe('getCurrentMinutes', () => {
        test('should return a number', () => {
            expect(typeof getCurrentMinutes()).toBe('number');
        });

        test('should return value between 0 and 1440', () => {
            const minutes = getCurrentMinutes();
            expect(minutes).toBeGreaterThanOrEqual(0);
            expect(minutes).toBeLessThan(1440);
        });
    });

    describe('isWeekend', () => {
        test('should return true for Saturday', () => {
            // Use explicit local time to avoid timezone issues
            const saturday = new Date(2025, 11, 6, 12, 0, 0); // December 6, 2025 is a Saturday
            expect(isWeekend(saturday)).toBe(true);
        });

        test('should return true for Sunday', () => {
            const sunday = new Date(2025, 11, 7, 12, 0, 0); // December 7, 2025 is a Sunday
            expect(isWeekend(sunday)).toBe(true);
        });

        test('should return false for Monday', () => {
            const monday = new Date(2025, 11, 8, 12, 0, 0); // December 8, 2025 is a Monday
            expect(isWeekend(monday)).toBe(false);
        });

        test('should return false for Friday', () => {
            const friday = new Date(2025, 11, 5, 12, 0, 0); // December 5, 2025 is a Friday
            expect(isWeekend(friday)).toBe(false);
        });
    });

    describe('getNextWorkday', () => {
        test('should return Monday when given Friday', () => {
            const friday = new Date(2025, 11, 5, 12, 0, 0); // Friday
            const nextWorkday = getNextWorkday(friday);
            expect(nextWorkday.getDay()).toBe(1); // Monday
        });

        test('should return Monday when given Saturday', () => {
            const saturday = new Date(2025, 11, 6, 12, 0, 0); // Saturday
            const nextWorkday = getNextWorkday(saturday);
            expect(nextWorkday.getDay()).toBe(1); // Monday
        });

        test('should return Monday when given Sunday', () => {
            const sunday = new Date(2025, 11, 7, 12, 0, 0); // Sunday
            const nextWorkday = getNextWorkday(sunday);
            expect(nextWorkday.getDay()).toBe(1); // Monday
        });

        test('should return next day when given Monday', () => {
            const monday = new Date(2025, 11, 8, 12, 0, 0); // Monday
            const nextWorkday = getNextWorkday(monday);
            expect(nextWorkday.getDay()).toBe(2); // Tuesday
        });

        test('should return next day when given Wednesday', () => {
            const wednesday = new Date(2025, 11, 10, 12, 0, 0); // Wednesday
            const nextWorkday = getNextWorkday(wednesday);
            expect(nextWorkday.getDay()).toBe(4); // Thursday
        });
    });

    describe('formatTime', () => {
        test('should format ISO time string correctly', () => {
            const result = formatTime('2025-12-06T09:30:00Z');
            expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
        });
    });
});

describe('formatTask', () => {
    test('should format high priority task with red indicator', () => {
        const task = { title: 'Important task', priority: 5, projectName: 'Work' };
        const result = formatTask(task, 1);
        expect(result).toContain('🔴');
        expect(result).toContain('**Important task**');
        expect(result).toContain('Work');
    });

    test('should format medium priority task with yellow indicator', () => {
        const task = { title: 'Medium task', priority: 3, projectName: 'Personal' };
        const result = formatTask(task, 2);
        expect(result).toContain('🟡');
        expect(result).toContain('**Medium task**');
    });

    test('should format low/no priority task with white indicator', () => {
        const task = { title: 'Low task', priority: 0, projectName: 'Misc' };
        const result = formatTask(task, 3);
        expect(result).toContain('⚪');
    });

    test('should include due date when present', () => {
        const task = {
            title: 'Task with due',
            priority: 3,
            dueDate: '2025-12-10T00:00:00Z',
            projectName: 'Work'
        };
        const result = formatTask(task, 1);
        expect(result).toContain('due:');
        expect(result).toContain('2025-12-10');
    });

    test('should handle task without project name', () => {
        const task = { title: 'No project', priority: 1 };
        const result = formatTask(task, 1);
        expect(result).toContain('No project');
    });
});

describe('DAY_STRUCTURE constants', () => {
    test('should have correct work start time (8:00 AM)', () => {
        expect(DAY_STRUCTURE.workStart).toBe(8 * 60); // 480 minutes
    });

    test('should have correct work end time (5:00 PM)', () => {
        expect(DAY_STRUCTURE.workEnd).toBe(17 * 60); // 1020 minutes
    });

    test('should have correct personal end time (8:30 PM)', () => {
        expect(DAY_STRUCTURE.personalEnd).toBe(20 * 60 + 30); // 1230 minutes
    });

    test('should have correct shutdown start time (8:30 PM)', () => {
        expect(DAY_STRUCTURE.shutdownStart).toBe(20 * 60 + 30); // 1230 minutes
    });
});

describe('AVOIDANCE_TYPES', () => {
    test('should have 11 avoidance types', () => {
        expect(Object.keys(AVOIDANCE_TYPES).length).toBe(11);
    });

    test('should have required types', () => {
        expect(AVOIDANCE_TYPES).toHaveProperty('too_big');
        expect(AVOIDANCE_TYPES).toHaveProperty('unclear');
        expect(AVOIDANCE_TYPES).toHaveProperty('boring');
        expect(AVOIDANCE_TYPES).toHaveProperty('scary');
        expect(AVOIDANCE_TYPES).toHaveProperty('blocked');
        expect(AVOIDANCE_TYPES).toHaveProperty('distracted');
        expect(AVOIDANCE_TYPES).toHaveProperty('low_energy');
        expect(AVOIDANCE_TYPES).toHaveProperty('overwhelmed');
        expect(AVOIDANCE_TYPES).toHaveProperty('forgot');
        expect(AVOIDANCE_TYPES).toHaveProperty('interruptions');
        expect(AVOIDANCE_TYPES).toHaveProperty('other');
    });

    test('each type should have label and description', () => {
        Object.values(AVOIDANCE_TYPES).forEach(type => {
            expect(type).toHaveProperty('label');
            expect(type).toHaveProperty('description');
            expect(typeof type.label).toBe('string');
            expect(typeof type.description).toBe('string');
        });
    });
});

const {
    convertRelativeDate,
    formatDate,
    parseDurationFromContent,
    buildUpdatePayload,
    prepareRescheduleUpdates,
    DEFAULT_DURATION_MINUTES
} = require('../../src/services/ticktick-sync');

describe('TickTick Sync Service', () => {
    describe('formatDate', () => {
        it('should format date to YYYY-MM-DD', () => {
            const date = new Date('2025-12-25T10:30:00');
            expect(formatDate(date)).toBe('2025-12-25');
        });
    });

    describe('convertRelativeDate', () => {
        // Store original Date for restoration
        const RealDate = Date;

        beforeEach(() => {
            // Mock Date to be a Wednesday (Dec 11, 2025)
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2025-12-11T10:00:00'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should convert "tomorrow" to next day', () => {
            expect(convertRelativeDate('tomorrow')).toBe('2025-12-12');
        });

        it('should convert "monday" to next Monday', () => {
            // Dec 11 is Thursday, next Monday is Dec 15
            expect(convertRelativeDate('monday')).toBe('2025-12-15');
        });

        it('should convert "weekend" to next Saturday', () => {
            // Dec 11 is Thursday, next Saturday is Dec 13
            expect(convertRelativeDate('weekend')).toBe('2025-12-13');
        });

        it('should convert "next_week" to 7 days later', () => {
            expect(convertRelativeDate('next_week')).toBe('2025-12-18');
        });

        it('should convert "someday" to 14 days later', () => {
            expect(convertRelativeDate('someday')).toBe('2025-12-25');
        });

        it('should pass through ISO date strings', () => {
            expect(convertRelativeDate('2025-12-25')).toBe('2025-12-25');
            expect(convertRelativeDate('2025-12-25T10:00:00')).toBe('2025-12-25');
        });

        it('should handle case insensitivity', () => {
            expect(convertRelativeDate('TOMORROW')).toBe('2025-12-12');
            expect(convertRelativeDate('Monday')).toBe('2025-12-15');
        });
    });

    describe('parseDurationFromContent', () => {
        it('should parse duration from content', () => {
            expect(parseDurationFromContent('duration:30')).toBe(30);
            expect(parseDurationFromContent('duration:15\nSome description')).toBe(15);
            expect(parseDurationFromContent('Task info\nduration:45')).toBe(45);
        });

        it('should return default duration when no duration found', () => {
            expect(parseDurationFromContent('')).toBe(DEFAULT_DURATION_MINUTES);
            expect(parseDurationFromContent(null)).toBe(DEFAULT_DURATION_MINUTES);
            expect(parseDurationFromContent('No duration here')).toBe(DEFAULT_DURATION_MINUTES);
        });

        it('should be case insensitive', () => {
            expect(parseDurationFromContent('DURATION:60')).toBe(60);
            expect(parseDurationFromContent('Duration:20')).toBe(20);
        });
    });

    describe('buildUpdatePayload', () => {
        it('should build correct payload with taskId and projectId', () => {
            const task = { taskId: 'task123', projectId: 'proj456' };
            const payload = buildUpdatePayload(task, '2025-12-15');

            expect(payload.task_id).toBe('task123');
            expect(payload.project_id).toBe('proj456');
            expect(payload.timeZone).toBe('America/New_York');
        });

        it('should use id if taskId not present', () => {
            const task = { id: 'task789', projectId: 'proj456' };
            const payload = buildUpdatePayload(task, '2025-12-15');

            expect(payload.task_id).toBe('task789');
        });

        it('should include timeZone field', () => {
            const task = { taskId: 'task123', projectId: 'proj456' };
            const payload = buildUpdatePayload(task, '2025-12-15');

            expect(payload.timeZone).toBe('America/New_York');
        });

        it('should set start_date to 9 AM EST (14:00 UTC)', () => {
            const task = { taskId: 'task123', projectId: 'proj456' };
            const payload = buildUpdatePayload(task, '2025-12-15');

            // Start should be 9 AM EST = 14:00 UTC
            expect(payload.start_date).toBe('2025-12-15T14:00:00.000+0000');
        });

        it('should set due_date based on duration (default 30 min)', () => {
            const task = { taskId: 'task123', projectId: 'proj456' };
            const payload = buildUpdatePayload(task, '2025-12-15');

            // Due should be 9 AM + 30 min = 9:30 AM EST = 14:30 UTC
            expect(payload.due_date).toBe('2025-12-15T14:30:00.000+0000');
        });

        it('should respect duration from task content', () => {
            const task = { taskId: 'task123', projectId: 'proj456', content: 'duration:15' };
            const payload = buildUpdatePayload(task, '2025-12-15');

            // Start at 9 AM EST = 14:00 UTC
            expect(payload.start_date).toBe('2025-12-15T14:00:00.000+0000');
            // Due at 9:15 AM EST = 14:15 UTC
            expect(payload.due_date).toBe('2025-12-15T14:15:00.000+0000');
        });

        it('should handle 60 minute duration', () => {
            const task = { taskId: 'task123', projectId: 'proj456', content: 'duration:60' };
            const payload = buildUpdatePayload(task, '2025-12-15');

            // Start at 9 AM EST = 14:00 UTC
            expect(payload.start_date).toBe('2025-12-15T14:00:00.000+0000');
            // Due at 10 AM EST = 15:00 UTC
            expect(payload.due_date).toBe('2025-12-15T15:00:00.000+0000');
        });

        it('should handle 5 minute duration', () => {
            const task = { taskId: 'task123', projectId: 'proj456', content: 'duration:5\nQuick task' };
            const payload = buildUpdatePayload(task, '2025-12-15');

            // Start at 9 AM EST = 14:00 UTC
            expect(payload.start_date).toBe('2025-12-15T14:00:00.000+0000');
            // Due at 9:05 AM EST = 14:05 UTC
            expect(payload.due_date).toBe('2025-12-15T14:05:00.000+0000');
        });
    });

    describe('prepareRescheduleUpdates', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2025-12-11T10:00:00'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should prepare updates for tasks with projectId', () => {
            const tasks = [
                { taskId: 't1', title: 'Task 1', newDate: 'tomorrow', reason: 'Test', projectId: 'proj1' },
                { taskId: 't2', title: 'Task 2', newDate: 'monday', reason: 'Test', projectId: 'proj2' }
            ];

            const result = prepareRescheduleUpdates(tasks);

            expect(result.updates).toHaveLength(2);
            expect(result.errors).toHaveLength(0);
            expect(result.updates[0].task_id).toBe('t1');
            expect(result.updates[0].convertedDate).toBe('2025-12-12');
            expect(result.updates[1].convertedDate).toBe('2025-12-15');
        });

        it('should report errors for tasks without projectId', () => {
            const tasks = [
                { taskId: 't1', title: 'Task 1', newDate: 'tomorrow', reason: 'Test' }, // Missing projectId
                { taskId: 't2', title: 'Task 2', newDate: 'monday', reason: 'Test', projectId: 'proj2' }
            ];

            const result = prepareRescheduleUpdates(tasks);

            expect(result.updates).toHaveLength(1);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].taskId).toBe('t1');
            expect(result.errors[0].error).toContain('Missing projectId');
        });

        it('should handle empty task list', () => {
            const result = prepareRescheduleUpdates([]);

            expect(result.updates).toHaveLength(0);
            expect(result.errors).toHaveLength(0);
        });

        it('should include reason and title in updates', () => {
            const tasks = [
                { taskId: 't1', title: 'Important Task', newDate: 'tomorrow', reason: 'Past work hours', projectId: 'proj1' }
            ];

            const result = prepareRescheduleUpdates(tasks);

            expect(result.updates[0].title).toBe('Important Task');
            expect(result.updates[0].reason).toBe('Past work hours');
            expect(result.updates[0].originalDate).toBe('tomorrow');
        });
    });
});

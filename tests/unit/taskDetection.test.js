/**
 * Unit tests for task type detection and Kanban column determination
 */

const {
    detectItemType,
    determineKanbanColumn,
    parseTaskMetadata,
    calculatePriorityScore,
    WORK_PROJECT_ID,
    ROUTINES_PROJECT_ID,
    KANBAN_COLUMNS
} = require('../../src/processor');

describe('detectItemType', () => {
    describe('explicit type metadata', () => {
        test('should return "routine" when type:routine in content', () => {
            const task = {
                title: 'Morning standup',
                content: 'type:routine\nDaily sync'
            };
            expect(detectItemType(task)).toBe('routine');
        });

        test('should return "event" when type:event in content', () => {
            const task = {
                title: 'Team meeting',
                content: 'type:event\nWeekly team sync'
            };
            expect(detectItemType(task)).toBe('event');
        });

        test('should return "task" when type:task in content', () => {
            const task = {
                title: 'Fix bug',
                content: 'type:task\nFix login issue'
            };
            expect(detectItemType(task)).toBe('task');
        });
    });

    describe('project-based detection', () => {
        test('should return "routine" for tasks in Routines project', () => {
            const task = {
                title: 'Morning routine',
                projectId: ROUTINES_PROJECT_ID
            };
            expect(detectItemType(task)).toBe('routine');
        });
    });

    describe('keyword-based detection', () => {
        test('should detect "meeting" as event', () => {
            const task = {
                title: 'Team meeting at 3pm',
                projectId: WORK_PROJECT_ID,
                startDate: '2025-12-06T15:00:00Z'
            };
            expect(detectItemType(task)).toBe('event');
        });

        test('should detect "call" as event when has start time', () => {
            const task = {
                title: 'Call with client',
                projectId: WORK_PROJECT_ID,
                startDate: '2025-12-06T10:00:00Z'
            };
            expect(detectItemType(task)).toBe('event');
        });

        test('should detect "appointment" as event when has start time', () => {
            const task = {
                title: 'Doctor appointment',
                startDate: '2025-12-06T14:00:00Z'
            };
            expect(detectItemType(task)).toBe('event');
        });

        test('should detect "standup" as event when has start time', () => {
            const task = {
                title: 'Daily standup',
                startDate: '2025-12-06T09:00:00Z'
            };
            expect(detectItemType(task)).toBe('event');
        });

        test('should detect "1:1" as event when has start time', () => {
            const task = {
                title: '1:1 with manager',
                startDate: '2025-12-06T11:00:00Z'
            };
            expect(detectItemType(task)).toBe('event');
        });
    });

    describe('same-day duration detection', () => {
        test('should detect as event when same day, short duration, and event keyword', () => {
            const task = {
                title: 'Demo presentation',
                startDate: '2025-12-06T14:00:00Z',
                dueDate: '2025-12-06T15:00:00Z' // 1 hour duration
            };
            expect(detectItemType(task)).toBe('event');
        });

        test('should not detect as event when duration > 4 hours (without event keyword)', () => {
            const task = {
                title: 'Long coding day',
                startDate: '2025-12-06T09:00:00Z',
                dueDate: '2025-12-06T17:00:00Z' // 8 hour duration
            };
            expect(detectItemType(task)).toBe('task');
        });
    });

    describe('default to task', () => {
        test('should return "task" for regular tasks without special indicators', () => {
            const task = {
                title: 'Fix the login bug',
                projectId: WORK_PROJECT_ID
            };
            expect(detectItemType(task)).toBe('task');
        });

        test('should return "task" for tasks with meeting keyword but no start time', () => {
            const task = {
                title: 'Schedule meeting with team',
                projectId: WORK_PROJECT_ID
            };
            expect(detectItemType(task)).toBe('task');
        });
    });
});

describe('determineKanbanColumn', () => {
    const today = new Date().toISOString().split('T')[0];

    describe('explicit kanban metadata', () => {
        test('should return "backlog" when kanban:backlog in content', () => {
            const task = { content: 'kanban:backlog' };
            expect(determineKanbanColumn(task, {})).toBe(KANBAN_COLUMNS.BACKLOG);
        });

        test('should return "ready" when kanban:ready in content', () => {
            const task = { content: 'kanban:ready' };
            expect(determineKanbanColumn(task, {})).toBe(KANBAN_COLUMNS.READY);
        });

        test('should return "in_progress" when kanban:in_progress in content', () => {
            const task = { content: 'kanban:in_progress' };
            expect(determineKanbanColumn(task, {})).toBe(KANBAN_COLUMNS.IN_PROGRESS);
        });

        test('should return "waiting" when kanban:waiting in content', () => {
            const task = { content: 'kanban:waiting' };
            expect(determineKanbanColumn(task, {})).toBe(KANBAN_COLUMNS.WAITING);
        });
    });

    describe('completed tasks', () => {
        test('should return "done" for completed tasks (status 2)', () => {
            const task = { status: 2 };
            expect(determineKanbanColumn(task, {})).toBe(KANBAN_COLUMNS.DONE);
        });
    });

    describe('waiting/blocked detection', () => {
        test('should detect "blocked by" as waiting', () => {
            const task = { content: 'blocked by dependency' };
            expect(determineKanbanColumn(task, {})).toBe(KANBAN_COLUMNS.WAITING);
        });

        test('should detect "waiting on" as waiting', () => {
            const task = { content: 'waiting on review' };
            expect(determineKanbanColumn(task, {})).toBe(KANBAN_COLUMNS.WAITING);
        });

        test('should detect "waiting for" as waiting', () => {
            const task = { title: 'Waiting for approval' };
            expect(determineKanbanColumn(task, {})).toBe(KANBAN_COLUMNS.WAITING);
        });

        test('should detect "pending review" as waiting', () => {
            const task = { content: 'pending review from team' };
            expect(determineKanbanColumn(task, {})).toBe(KANBAN_COLUMNS.WAITING);
        });
    });

    describe('scheduled for today', () => {
        test('should return "in_progress" when scheduled for today', () => {
            const task = {
                startDate: new Date().toISOString()
            };
            expect(determineKanbanColumn(task, {})).toBe(KANBAN_COLUMNS.IN_PROGRESS);
        });
    });

    describe('due date handling', () => {
        test('should return "in_progress" when due today', () => {
            const task = {
                dueDate: new Date().toISOString()
            };
            expect(determineKanbanColumn(task, {})).toBe(KANBAN_COLUMNS.IN_PROGRESS);
        });

        test('should return "in_progress" when overdue', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const task = {
                dueDate: yesterday.toISOString()
            };
            expect(determineKanbanColumn(task, {})).toBe(KANBAN_COLUMNS.IN_PROGRESS);
        });

        test('should return "ready" when due in future', () => {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            const task = {
                dueDate: nextWeek.toISOString()
            };
            expect(determineKanbanColumn(task, {})).toBe(KANBAN_COLUMNS.READY);
        });
    });

    describe('no due date', () => {
        test('should return "backlog" when no due date', () => {
            const task = { title: 'Someday task' };
            expect(determineKanbanColumn(task, {})).toBe(KANBAN_COLUMNS.BACKLOG);
        });
    });
});

describe('parseTaskMetadata', () => {
    describe('duration parsing', () => {
        test('should parse duration from content', () => {
            const task = {
                title: 'Quick task',
                content: 'duration:15',
                projectId: WORK_PROJECT_ID
            };
            const metadata = parseTaskMetadata(task);
            expect(metadata.duration).toBe(15);
        });

        test('should default to 30 minutes', () => {
            const task = {
                title: 'Task without duration',
                projectId: WORK_PROJECT_ID
            };
            const metadata = parseTaskMetadata(task);
            expect(metadata.duration).toBe(30);
        });
    });

    describe('work detection', () => {
        test('should set isWork true for work project', () => {
            const task = {
                title: 'Work task',
                projectId: WORK_PROJECT_ID
            };
            const metadata = parseTaskMetadata(task);
            expect(metadata.isWork).toBe(true);
        });

        test('should set isWork false for other projects', () => {
            const task = {
                title: 'Personal task',
                projectId: 'other-project-id'
            };
            const metadata = parseTaskMetadata(task);
            expect(metadata.isWork).toBe(false);
        });
    });

    describe('type detection', () => {
        test('should detect type correctly', () => {
            const routineTask = {
                title: 'Routine',
                projectId: ROUTINES_PROJECT_ID
            };
            expect(parseTaskMetadata(routineTask).type).toBe('routine');
        });

        test('should set isFixed for routines', () => {
            const task = {
                title: 'Morning routine',
                projectId: ROUTINES_PROJECT_ID
            };
            const metadata = parseTaskMetadata(task);
            expect(metadata.isFixed).toBe(true);
        });

        test('should set isFixed for events', () => {
            const task = {
                title: 'Meeting at noon',
                content: 'type:event',
                projectId: WORK_PROJECT_ID
            };
            const metadata = parseTaskMetadata(task);
            expect(metadata.isFixed).toBe(true);
        });

        test('should not set isFixed for regular tasks', () => {
            const task = {
                title: 'Regular task',
                projectId: WORK_PROJECT_ID
            };
            const metadata = parseTaskMetadata(task);
            expect(metadata.isFixed).toBe(false);
        });
    });

    describe('deadline parsing', () => {
        test('should parse trueDeadline from content', () => {
            const task = {
                title: 'Task with deadline',
                content: 'trueDeadline:2025-12-15T17:00:00Z',
                projectId: WORK_PROJECT_ID
            };
            const metadata = parseTaskMetadata(task);
            expect(metadata.trueDeadline).toBeInstanceOf(Date);
        });

        test('should use dueDate when no trueDeadline', () => {
            const task = {
                title: 'Task with due date',
                dueDate: '2025-12-15T00:00:00Z',
                projectId: WORK_PROJECT_ID
            };
            const metadata = parseTaskMetadata(task);
            expect(metadata.trueDeadline).toBeInstanceOf(Date);
        });
    });

    describe('kanban column', () => {
        test('should set kanbanColumn for work tasks', () => {
            const task = {
                title: 'Work task',
                projectId: WORK_PROJECT_ID
            };
            const metadata = parseTaskMetadata(task);
            expect(metadata.kanbanColumn).toBe(KANBAN_COLUMNS.BACKLOG);
        });

        test('should not set kanbanColumn for non-work tasks', () => {
            const task = {
                title: 'Personal task',
                projectId: 'personal-project'
            };
            const metadata = parseTaskMetadata(task);
            expect(metadata.kanbanColumn).toBeNull();
        });
    });
});

describe('calculatePriorityScore', () => {
    describe('base priority weighting', () => {
        test('should give higher score for high priority (5)', () => {
            const highPriority = { title: 'High', priority: 5, projectId: 'other' };
            const lowPriority = { title: 'Low', priority: 1, projectId: 'other' };
            expect(calculatePriorityScore(highPriority)).toBeGreaterThan(calculatePriorityScore(lowPriority));
        });

        test('should handle zero priority', () => {
            const task = { title: 'No priority', priority: 0, projectId: 'other' };
            expect(calculatePriorityScore(task)).toBeGreaterThanOrEqual(0);
        });
    });

    describe('deadline urgency', () => {
        test('should give highest score for overdue tasks', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const overdue = {
                title: 'Overdue',
                dueDate: yesterday.toISOString(),
                projectId: 'other'
            };
            const normal = { title: 'Normal', projectId: 'other' };
            expect(calculatePriorityScore(overdue)).toBeGreaterThan(calculatePriorityScore(normal));
        });

        test('should give high score for due today', () => {
            const dueToday = {
                title: 'Due today',
                dueDate: new Date().toISOString(),
                projectId: 'other'
            };
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            const dueLater = {
                title: 'Due later',
                dueDate: nextWeek.toISOString(),
                projectId: 'other'
            };
            expect(calculatePriorityScore(dueToday)).toBeGreaterThan(calculatePriorityScore(dueLater));
        });
    });

    describe('kanban column weighting (work tasks)', () => {
        test('should give highest score for in_progress column', () => {
            const inProgress = {
                title: 'In progress',
                content: 'kanban:in_progress',
                projectId: WORK_PROJECT_ID
            };
            const backlog = {
                title: 'Backlog',
                content: 'kanban:backlog',
                projectId: WORK_PROJECT_ID
            };
            expect(calculatePriorityScore(inProgress)).toBeGreaterThan(calculatePriorityScore(backlog));
        });

        test('should deprioritize waiting tasks', () => {
            const waiting = {
                title: 'Waiting',
                content: 'kanban:waiting',
                projectId: WORK_PROJECT_ID
            };
            const ready = {
                title: 'Ready',
                content: 'kanban:ready',
                projectId: WORK_PROJECT_ID
            };
            expect(calculatePriorityScore(waiting)).toBeLessThan(calculatePriorityScore(ready));
        });

        test('should give very negative score for done tasks', () => {
            const done = {
                title: 'Done',
                status: 2,
                projectId: WORK_PROJECT_ID
            };
            expect(calculatePriorityScore(done)).toBeLessThan(0);
        });
    });
});

describe('KANBAN_COLUMNS constants', () => {
    test('should have all required columns', () => {
        expect(KANBAN_COLUMNS).toHaveProperty('BACKLOG');
        expect(KANBAN_COLUMNS).toHaveProperty('READY');
        expect(KANBAN_COLUMNS).toHaveProperty('IN_PROGRESS');
        expect(KANBAN_COLUMNS).toHaveProperty('WAITING');
        expect(KANBAN_COLUMNS).toHaveProperty('DONE');
    });

    test('columns should have correct values', () => {
        expect(KANBAN_COLUMNS.BACKLOG).toBe('backlog');
        expect(KANBAN_COLUMNS.READY).toBe('ready');
        expect(KANBAN_COLUMNS.IN_PROGRESS).toBe('in_progress');
        expect(KANBAN_COLUMNS.WAITING).toBe('waiting');
        expect(KANBAN_COLUMNS.DONE).toBe('done');
    });
});

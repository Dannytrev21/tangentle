/**
 * TickTick Sync Service
 * Handles syncing AI schedule changes back to TickTick
 */

// User's timezone - used for calculating correct UTC times
// Danny is in Eastern Time
const USER_TIMEZONE = 'America/New_York';

// Start of workday in local time (9 AM)
const WORKDAY_START_HOUR = 9;

/**
 * Get the UTC offset in hours for a given timezone on a specific date
 * @param {string} timezone - IANA timezone (e.g., 'America/New_York')
 * @param {Date} date - Date to check (for DST handling)
 * @returns {number} Offset in hours (e.g., -5 for EST, -4 for EDT)
 */
function getTimezoneOffsetHours(timezone, date) {
    // Create a formatter that outputs the timezone offset
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'shortOffset'
    });

    // Format the date and extract the offset
    const parts = formatter.formatToParts(date);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');

    if (offsetPart) {
        // Parse offset like "GMT-5" or "GMT-05:00"
        const match = offsetPart.value.match(/GMT([+-])(\d+)(?::(\d+))?/);
        if (match) {
            const sign = match[1] === '+' ? 1 : -1;
            const hours = parseInt(match[2], 10);
            const minutes = match[3] ? parseInt(match[3], 10) : 0;
            return sign * (hours + minutes / 60);
        }
    }

    // Fallback: assume EST (-5)
    return -5;
}

/**
 * Convert relative date strings to actual ISO date strings
 * Uses local date to avoid UTC day shift issues
 * @param {string} relativeDate - "tomorrow", "monday", "weekend", "next_week", or ISO date
 * @returns {string} ISO date string (YYYY-MM-DD format)
 */
function convertRelativeDate(relativeDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    switch (relativeDate.toLowerCase()) {
        case 'tomorrow':
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return formatDateLocal(tomorrow);

        case 'monday':
        case 'next_workday':
            // Find next Monday (or tomorrow if today is Sunday)
            const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
            const nextMonday = new Date(today);
            nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
            return formatDateLocal(nextMonday);

        case 'weekend':
        case 'saturday':
            // Find next Saturday
            const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
            const nextSaturday = new Date(today);
            nextSaturday.setDate(nextSaturday.getDate() + daysUntilSaturday);
            return formatDateLocal(nextSaturday);

        case 'sunday':
            // Find next Sunday
            const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
            const nextSunday = new Date(today);
            nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
            return formatDateLocal(nextSunday);

        case 'next_week':
            // One week from today
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            return formatDateLocal(nextWeek);

        case 'someday':
        case 'later':
            // Two weeks from now (or could be null to remove due date)
            const twoWeeks = new Date(today);
            twoWeeks.setDate(twoWeeks.getDate() + 14);
            return formatDateLocal(twoWeeks);

        default:
            // Assume it's already a date string (YYYY-MM-DD or ISO)
            if (relativeDate.match(/^\d{4}-\d{2}-\d{2}/)) {
                return relativeDate.split('T')[0];
            }
            // Fallback to tomorrow
            const fallback = new Date(today);
            fallback.setDate(fallback.getDate() + 1);
            return formatDateLocal(fallback);
    }
}

/**
 * Format Date object to YYYY-MM-DD string using LOCAL date components
 * This avoids UTC conversion issues that can shift the date by a day
 */
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Legacy function - kept for backwards compatibility
 * @deprecated Use formatDateLocal instead
 */
function formatDate(date) {
    return formatDateLocal(date);
}

// Default task duration in minutes (used when no duration specified)
const DEFAULT_DURATION_MINUTES = 30;

/**
 * Parse duration from task content (format: "duration:X" where X is minutes)
 * @param {string} content - Task content/description
 * @returns {number} Duration in minutes
 */
function parseDurationFromContent(content) {
    if (!content) return DEFAULT_DURATION_MINUTES;

    const match = content.match(/duration:(\d+)/i);
    if (match) {
        return parseInt(match[1], 10);
    }
    return DEFAULT_DURATION_MINUTES;
}

/**
 * Format a UTC time as TickTick ISO string
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {number} utcHours - Hours in UTC
 * @param {number} utcMinutes - Minutes
 * @returns {string} TickTick formatted ISO string
 */
function formatTickTickDateTime(dateStr, utcHours, utcMinutes = 0) {
    const hoursStr = String(Math.floor(utcHours)).padStart(2, '0');
    const minutesStr = String(utcMinutes).padStart(2, '0');
    return `${dateStr}T${hoursStr}:${minutesStr}:00.000+0000`;
}

/**
 * Build the TickTick API update payload for a task
 * Sets start date to 9 AM and due date to 9 AM + duration
 * @param {Object} task - Task with id, projectId, content, and fields to update
 * @param {string} newDueDate - New due date in YYYY-MM-DD format
 * @returns {Object} TickTick API payload
 */
function buildUpdatePayload(task, newDueDate) {
    // Parse the date
    const [year, month, day] = newDueDate.split('-').map(Number);

    // Create date at 9 AM local time (start of workday / peak focus)
    const localDate = new Date(year, month - 1, day, WORKDAY_START_HOUR, 0, 0, 0);

    // Get the timezone offset for proper UTC conversion
    const offsetHours = getTimezoneOffsetHours(USER_TIMEZONE, localDate);

    // Calculate UTC start time: 9 AM EST = 14:00 UTC (9 - (-5) = 14)
    const startUtcHours = WORKDAY_START_HOUR - offsetHours;

    // Get task duration (from content or default)
    const durationMinutes = parseDurationFromContent(task.content);

    // Calculate end time (start + duration)
    const totalMinutes = (startUtcHours * 60) + durationMinutes;
    const endUtcHours = Math.floor(totalMinutes / 60);
    const endUtcMinutes = totalMinutes % 60;

    // Format start and due dates
    const startDateISO = formatTickTickDateTime(newDueDate, startUtcHours, 0);
    const dueDateISO = formatTickTickDateTime(newDueDate, endUtcHours, endUtcMinutes);

    return {
        task_id: task.taskId || task.id,
        project_id: task.projectId,
        // Start at 9 AM, end at 9 AM + duration
        start_date: startDateISO,
        due_date: dueDateISO,
        timeZone: USER_TIMEZONE
    };
}

/**
 * Process rescheduled tasks and prepare TickTick updates
 * @param {Array} rescheduledTasks - Array of {taskId, title, newDate, reason, projectId}
 * @returns {Object} { updates: Array, errors: Array, summary: string }
 */
function prepareRescheduleUpdates(rescheduledTasks) {
    const updates = [];
    const errors = [];

    for (const task of rescheduledTasks) {
        // Skip tasks without projectId (can't update without it)
        if (!task.projectId) {
            errors.push({
                taskId: task.taskId,
                title: task.title,
                error: 'Missing projectId - cannot update in TickTick'
            });
            continue;
        }

        try {
            const newDueDate = convertRelativeDate(task.newDate);
            const payload = buildUpdatePayload(task, newDueDate);

            updates.push({
                ...payload,
                title: task.title,
                originalDate: task.newDate,
                convertedDate: newDueDate,
                reason: task.reason
            });
        } catch (error) {
            errors.push({
                taskId: task.taskId,
                title: task.title,
                error: error.message
            });
        }
    }

    const summary = `Prepared ${updates.length} updates, ${errors.length} errors`;
    return { updates, errors, summary };
}

/**
 * Sync a single task update to TickTick via the server API
 * @param {string} baseUrl - Server base URL (e.g., 'http://localhost:3001')
 * @param {Object} update - Update payload from prepareRescheduleUpdates
 * @returns {Promise<Object>} { success: boolean, taskId, error? }
 */
async function syncTaskUpdate(baseUrl, update) {
    try {
        const response = await fetch(`${baseUrl}/api/ticktick/ticktick_update_task`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task_id: update.task_id,
                project_id: update.project_id,
                start_date: update.start_date,
                due_date: update.due_date,
                timeZone: update.timeZone || USER_TIMEZONE
            })
        });

        const result = await response.json();

        if (result.success) {
            return { success: true, taskId: update.task_id, title: update.title };
        } else {
            return { success: false, taskId: update.task_id, title: update.title, error: result.error };
        }
    } catch (error) {
        return { success: false, taskId: update.task_id, title: update.title, error: error.message };
    }
}

/**
 * Sync all rescheduled tasks to TickTick
 * @param {string} baseUrl - Server base URL
 * @param {Array} rescheduledTasks - Tasks to reschedule
 * @returns {Promise<Object>} { synced: number, failed: number, results: Array }
 */
async function syncRescheduledTasks(baseUrl, rescheduledTasks) {
    if (!rescheduledTasks || rescheduledTasks.length === 0) {
        return { synced: 0, failed: 0, results: [], skipped: 0 };
    }

    const { updates, errors } = prepareRescheduleUpdates(rescheduledTasks);

    const results = [];
    let synced = 0;
    let failed = 0;

    // Process updates sequentially to avoid rate limiting
    for (const update of updates) {
        const result = await syncTaskUpdate(baseUrl, update);
        results.push(result);

        if (result.success) {
            synced++;
            console.log(`[TickTick Sync] Updated: "${update.title}" → ${update.convertedDate}`);
        } else {
            failed++;
            console.error(`[TickTick Sync] Failed: "${update.title}" - ${result.error}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Add errors to results
    for (const error of errors) {
        results.push({ success: false, ...error });
        failed++;
    }

    return {
        synced,
        failed,
        skipped: errors.length,
        results
    };
}

module.exports = {
    convertRelativeDate,
    formatDate,
    formatDateLocal,
    parseDurationFromContent,
    formatTickTickDateTime,
    buildUpdatePayload,
    prepareRescheduleUpdates,
    syncTaskUpdate,
    syncRescheduledTasks,
    // Constants for testing
    USER_TIMEZONE,
    WORKDAY_START_HOUR,
    DEFAULT_DURATION_MINUTES
};

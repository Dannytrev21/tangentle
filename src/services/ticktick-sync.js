/**
 * TickTick Sync Service
 * Handles syncing AI schedule changes back to TickTick
 */

/**
 * Convert relative date strings to actual ISO date strings
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
            return formatDate(tomorrow);

        case 'monday':
        case 'next_workday':
            // Find next Monday (or tomorrow if today is Sunday)
            const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
            const nextMonday = new Date(today);
            nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
            return formatDate(nextMonday);

        case 'weekend':
        case 'saturday':
            // Find next Saturday
            const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
            const nextSaturday = new Date(today);
            nextSaturday.setDate(nextSaturday.getDate() + daysUntilSaturday);
            return formatDate(nextSaturday);

        case 'sunday':
            // Find next Sunday
            const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
            const nextSunday = new Date(today);
            nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
            return formatDate(nextSunday);

        case 'next_week':
            // One week from today
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            return formatDate(nextWeek);

        case 'someday':
        case 'later':
            // Two weeks from now (or could be null to remove due date)
            const twoWeeks = new Date(today);
            twoWeeks.setDate(twoWeeks.getDate() + 14);
            return formatDate(twoWeeks);

        default:
            // Assume it's already a date string (YYYY-MM-DD or ISO)
            if (relativeDate.match(/^\d{4}-\d{2}-\d{2}/)) {
                return relativeDate.split('T')[0];
            }
            // Fallback to tomorrow
            const fallback = new Date(today);
            fallback.setDate(fallback.getDate() + 1);
            return formatDate(fallback);
    }
}

/**
 * Format Date object to YYYY-MM-DD string
 */
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Build the TickTick API update payload for a task
 * @param {Object} task - Task with id, projectId, and fields to update
 * @param {string} newDueDate - New due date in YYYY-MM-DD format
 * @returns {Object} TickTick API payload
 */
function buildUpdatePayload(task, newDueDate) {
    // TickTick expects ISO datetime with timezone for dueDate
    // Using noon to avoid timezone issues
    const dueDateISO = `${newDueDate}T12:00:00.000+0000`;

    return {
        task_id: task.taskId || task.id,
        project_id: task.projectId,
        due_date: dueDateISO
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
                due_date: update.due_date
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
    buildUpdatePayload,
    prepareRescheduleUpdates,
    syncTaskUpdate,
    syncRescheduledTasks
};

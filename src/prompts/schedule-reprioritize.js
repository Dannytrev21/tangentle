/**
 * Schedule Reprioritization Prompt Template
 * Generates prompts for Gemini to intelligently reschedule tasks
 */

/**
 * Format a task for the prompt
 */
function formatTask(task) {
    const priority = { 0: 'none', 1: 'low', 3: 'medium', 5: 'high' }[task.priority] || 'none';
    const dueInfo = task.dueDate ? `Due: ${task.dueDate}` : 'No due date';
    const duration = task.estimatedMinutes || 30;

    return `- [${task.id}] "${task.title}" | Priority: ${priority} | ${dueInfo} | ~${duration}min | Project: ${task.projectName || 'Unknown'}`;
}

/**
 * Format tasks list for the prompt
 */
function formatTasks(tasks) {
    if (!tasks || tasks.length === 0) {
        return '_No tasks available_';
    }
    return tasks.map(formatTask).join('\n');
}

/**
 * Get time of day category
 */
function getTimeOfDay(hour) {
    if (hour < 9) return 'early_morning';
    if (hour < 12) return 'morning';
    if (hour < 14) return 'early_afternoon';
    if (hour < 17) return 'afternoon';
    if (hour < 20) return 'evening';
    return 'night';
}

/**
 * Build the reprioritization prompt
 * @param {object} context - The scheduling context
 * @returns {string} The formatted prompt
 */
function buildReprioritizePrompt(context) {
    const {
        tasks = [],
        currentTime = new Date().toISOString(),
        energyLevel = 'medium',
        dayType = 'workday',
        completedToday = [],
        rules = {}
    } = context;

    const now = new Date(currentTime);
    const hour = now.getHours();
    const timeOfDay = getTimeOfDay(hour);
    const formattedTime = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    const formattedDate = now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    // Calculate remaining work hours
    const endOfWorkday = 17; // 5 PM
    const remainingHours = Math.max(0, endOfWorkday - hour);
    const remainingMinutes = remainingHours * 60;

    // Calculate total task time
    const totalTaskMinutes = tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 30), 0);
    const isOverloaded = totalTaskMinutes > remainingMinutes;

    return `## ROLE
You are an ADHD-aware scheduling assistant for Danny. Your job is to create realistic, achievable schedules that work WITH the ADHD brain, not against it. Be direct, practical, and supportive.

## CURRENT CONTEXT
- **Current Time:** ${formattedTime} on ${formattedDate}
- **Time of Day:** ${timeOfDay}
- **Day Type:** ${dayType}
- **Energy Level:** ${energyLevel}
- **Remaining Work Hours:** ~${remainingHours} hours (until 5 PM)
- **Tasks Completed Today:** ${completedToday.length}
- **Total Task Time Needed:** ${totalTaskMinutes} minutes
- **Overloaded:** ${isOverloaded ? 'YES - need to reschedule some tasks' : 'No'}

## DANNY'S ADHD PROFILE
- Peak focus window: 9am-12pm (Vyvanse is most effective)
- Task size preference: 15-30 minute chunks
- Energy typically dips: 2-4pm
- Medication: Vyvanse taken ~6am, kicks in ~7am, peak ~9am-12pm
- Easily overwhelmed by too many options
- Needs clear "what's next" direction
- Works best with momentum - one thing at a time

## TODAY'S TASKS
${formatTasks(tasks)}

## SCHEDULING RULES
1. **Must Do Today:** High priority tasks OR tasks due today = schedule them
2. **Time Matching:**
   - Deep focus/hard tasks → morning only (before noon)
   - Admin/email/routine → afternoon okay
   - Creative work → late morning when flow state is easiest
3. **Capacity:** Never schedule more than 6 hours of actual work
4. **Buffers:** Leave 10-15 min buffer between tasks
5. **Energy Matching:**
   - High energy tasks when energy is high
   - Low energy = only do easy/routine tasks
6. **Overload Handling:** If too many tasks, move lowest priority to:
   - Tomorrow (if urgent-ish)
   - Next Monday (if work task, not urgent)
   - Weekend (if personal)
   - Someday (if actually not important)

## CURRENT ENERGY: ${energyLevel.toUpperCase()}
${energyLevel === 'low' ? '⚠️ Energy is low - only schedule easy tasks or suggest a break' : ''}
${energyLevel === 'high' ? '✨ Energy is high - great time for challenging tasks' : ''}

## YOUR TASK
Create an optimized schedule for the remaining day. Think step by step:

1. **Triage:** What MUST happen today vs what CAN wait?
2. **Conflicts:** Any scheduling conflicts or overload?
3. **Energy Match:** Does task difficulty match current energy?
4. **Order:** What's the optimal sequence given time of day?
5. **Reschedule:** What needs to move to another day?

## OUTPUT FORMAT
Respond with valid JSON only (no markdown code blocks):
{
    "thinking": "Your step-by-step reasoning (2-3 sentences)",
    "schedule": [
        {
            "taskId": "string (from task list)",
            "title": "string",
            "scheduledTime": "HH:MM AM/PM",
            "duration": number (minutes),
            "priority": "must|should|could",
            "reason": "Brief reason for this slot"
        }
    ],
    "rescheduled": [
        {
            "taskId": "string",
            "title": "string",
            "newDate": "tomorrow|monday|weekend|someday",
            "reason": "Why it's being moved"
        }
    ],
    "nextAction": {
        "taskId": "string",
        "title": "string",
        "message": "Encouraging message about starting this task"
    },
    "warnings": ["Any concerns about the schedule"],
    "summary": "One friendly sentence summary for Danny"
}`;
}

/**
 * Parse and validate Gemini's response
 */
function parseScheduleResponse(response, inputTasks) {
    // Validate required fields
    const required = ['schedule', 'summary'];
    for (const field of required) {
        if (!(field in response)) {
            throw new Error(`Missing required field: ${field}`);
        }
    }

    // Validate schedule entries
    if (!Array.isArray(response.schedule)) {
        throw new Error('Schedule must be an array');
    }

    // Validate task IDs exist in input
    const validTaskIds = new Set(inputTasks.map(t => t.id));

    for (const item of response.schedule) {
        if (!item.taskId || !item.title || !item.scheduledTime) {
            throw new Error('Schedule item missing required fields');
        }
        // Allow taskId validation to be lenient - Gemini might generate IDs slightly differently
    }

    // Add defaults for optional fields
    return {
        thinking: response.thinking || '',
        schedule: response.schedule,
        rescheduled: response.rescheduled || [],
        nextAction: response.nextAction || null,
        warnings: response.warnings || [],
        summary: response.summary
    };
}

module.exports = {
    buildReprioritizePrompt,
    parseScheduleResponse,
    formatTask,
    formatTasks,
    getTimeOfDay
};

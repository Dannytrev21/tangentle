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
CRITICAL: You MUST respond with valid, complete JSON only. No markdown, no code blocks, no explanation text.
Keep responses concise - use short reasons (under 50 chars each).

{
    "thinking": "Brief reasoning (1-2 sentences max)",
    "schedule": [
        {"taskId": "id", "title": "name", "scheduledTime": "HH:MM AM/PM", "duration": 30, "priority": "must", "reason": "short reason"}
    ],
    "rescheduled": [
        {"taskId": "id", "title": "name", "newDate": "tomorrow", "reason": "short reason"}
    ],
    "nextAction": {"taskId": "id", "title": "name", "message": "Short encouraging message"},
    "warnings": ["Short warning if any"],
    "summary": "One short friendly sentence"
}

IMPORTANT RULES:
- Keep ALL string values SHORT (under 100 characters)
- Include ONLY tasks from the input list (use exact taskId values)
- schedule array: tasks to do today
- rescheduled array: tasks moved to another day
- If no tasks to schedule, use empty array: []
- If no tasks to reschedule, use empty array: []
- ALWAYS include summary field
- MUST be valid JSON that can be parsed`;
}

/**
 * Parse and validate Gemini's response
 */
function parseScheduleResponse(response, inputTasks) {
    // Validate required fields - be lenient and provide defaults
    if (!response.summary) {
        response.summary = 'Schedule optimized based on current energy and priorities.';
    }

    // Ensure schedule is an array
    if (!Array.isArray(response.schedule)) {
        response.schedule = [];
    }

    // Normalize schedule entries - handle variations in field naming
    const normalizedSchedule = response.schedule.map(item => {
        // Handle potential field name variations from Gemini
        const taskId = item.taskId || item.task_id || item.id || '';
        const title = item.title || item.name || item.taskTitle || '';
        const scheduledTime = item.scheduledTime || item.scheduled_time || item.time || item.startTime || '';

        return {
            taskId,
            title,
            scheduledTime,
            duration: item.duration || 30,
            priority: item.priority || 'should',
            reason: item.reason || ''
        };
    }).filter(item => item.taskId && item.title); // Only keep valid entries

    // Normalize rescheduled entries
    const normalizedRescheduled = (response.rescheduled || []).map(item => ({
        taskId: item.taskId || item.task_id || item.id || '',
        title: item.title || item.name || '',
        newDate: item.newDate || item.new_date || item.date || 'tomorrow',
        reason: item.reason || ''
    })).filter(item => item.title); // Only keep valid entries

    // Normalize nextAction
    let nextAction = response.nextAction || response.next_action || null;
    if (nextAction) {
        nextAction = {
            taskId: nextAction.taskId || nextAction.task_id || '',
            title: nextAction.title || nextAction.name || '',
            message: nextAction.message || 'Start with this one!'
        };
    }

    return {
        thinking: response.thinking || response.reasoning || '',
        schedule: normalizedSchedule,
        rescheduled: normalizedRescheduled,
        nextAction,
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

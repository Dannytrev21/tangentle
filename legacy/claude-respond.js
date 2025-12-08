// Helper for Claude Code to respond to web UI commands

const fs = require('fs');
const path = require('path');

const RESPONSE_FILE = path.join(__dirname, '.command-responses.json');

/**
 * Respond to a command from the web UI
 * @param {string} commandId - The command ID to respond to
 * @param {object} response - The response object with message and waitingFor properties
 */
function respondToCommand(commandId, response) {
    const responses = fs.existsSync(RESPONSE_FILE)
        ? JSON.parse(fs.readFileSync(RESPONSE_FILE, 'utf8'))
        : {};

    responses[commandId] = {
        response,
        timestamp: Date.now()
    };

    fs.writeFileSync(RESPONSE_FILE, JSON.stringify(responses, null, 2));
    console.log(`✅ Response saved for ${commandId}`);
    console.log(`📤 Web UI will receive this response`);

    return true;
}

/**
 * Get pending commands from the queue
 */
function getPendingCommands() {
    const COMMAND_QUEUE = path.join(__dirname, '.command-queue.json');
    if (fs.existsSync(COMMAND_QUEUE)) {
        const data = JSON.parse(fs.readFileSync(COMMAND_QUEUE, 'utf8'));
        return data.commands || [];
    }
    return [];
}

/**
 * Create a formatted focus response from TickTick data
 */
function formatFocusResponse(highPriorityTasks, mediumPriorityTasks) {
    let message = `🎯 **FOCUS MODE - Priority Tasks**\n\n`;

    if (highPriorityTasks && highPriorityTasks.length > 0) {
        message += `**🔴 HIGH PRIORITY (${highPriorityTasks.length} tasks):**\n`;
        highPriorityTasks.forEach(task => {
            const project = task.projectName || 'Unknown';
            const daysOverdue = task.daysOverdue || 'today';
            message += `• ${project} **${task.title}**`;
            if (typeof daysOverdue === 'number') {
                message += ` (${daysOverdue} days overdue)`;
            }
            message += `\n`;

            if (task.subtasks && task.subtasks.length > 0) {
                task.subtasks.forEach(sub => {
                    message += `  - [ ] ${sub}\n`;
                });
            }
        });
        message += `\n`;
    }

    if (mediumPriorityTasks && mediumPriorityTasks.length > 0) {
        message += `**🟡 MEDIUM PRIORITY (${mediumPriorityTasks.length} tasks):**\n`;
        mediumPriorityTasks.forEach(task => {
            const project = task.projectName || 'Unknown';
            const daysOverdue = task.daysOverdue || 'today';
            message += `• ${project} **${task.title}**`;
            if (typeof daysOverdue === 'number') {
                message += ` (${daysOverdue} days overdue)`;
            }
            message += `\n`;
        });
        message += `\n`;
    }

    const totalTasks = (highPriorityTasks?.length || 0) + (mediumPriorityTasks?.length || 0);

    if (totalTasks === 0) {
        message = `🎉 **No urgent priority tasks!**\n\nYou're all caught up on high and medium priority items.\n\nWould you like to see all your tasks or plan what's next?`;
        return {
            message,
            waitingFor: false
        };
    }

    message += `**📊 Summary:** ${totalTasks} urgent tasks\n\n`;

    if (highPriorityTasks && highPriorityTasks.length > 0) {
        message += `**💡 Recommended:** Start with "${highPriorityTasks[0].title}"\n\n`;
    }

    message += `Which task do you want to tackle first?`;

    return {
        message,
        waitingFor: true
    };
}

// ============================================================
// FOCUS SESSION HELPERS
// ============================================================

const FOCUS_SESSIONS_FILE = path.join(__dirname, '.focus-sessions.json');

function loadFocusSessions() {
    if (fs.existsSync(FOCUS_SESSIONS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(FOCUS_SESSIONS_FILE, 'utf8'));
        } catch (e) {
            return {};
        }
    }
    return {};
}

function saveFocusSessions(sessions) {
    fs.writeFileSync(FOCUS_SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

function getFocusSession(sessionId) {
    const sessions = loadFocusSessions();
    return sessions[sessionId] || null;
}

function updateFocusSession(sessionId, data) {
    const sessions = loadFocusSessions();
    sessions[sessionId] = {
        ...sessions[sessionId],
        ...data,
        lastUpdated: Date.now()
    };
    saveFocusSessions(sessions);
    return sessions[sessionId];
}

function clearFocusSession(sessionId) {
    const sessions = loadFocusSessions();
    delete sessions[sessionId];
    saveFocusSessions(sessions);
}

/**
 * Create a new focus session
 */
function createFocusSession(sessionId, intendedTask) {
    return updateFocusSession(sessionId, {
        active: true,
        startedAt: Date.now(),
        intendedTask: intendedTask,
        state: 'asked_current_activity', // Initial state after showing what to do
        avoidanceReason: null,
        plan: null,
        checkIns: [],
        strategies: []
    });
}

// ============================================================
// ADHD COACHING STRATEGIES
// ============================================================

const AVOIDANCE_STRATEGIES = {
    too_big: {
        name: "Task feels too big",
        questions: [
            "What's the very first tiny step? Like, what would you do in the first 2 minutes?",
            "Can we break this into smaller chunks right now?"
        ],
        strategies: [
            "**2-Minute Version**: What if you just did this task for 2 minutes? Set a timer. When it goes off, you can stop guilt-free.",
            "**First Step Only**: Don't think about the whole task. Just do step 1. We'll worry about step 2 later.",
            "**Swiss Cheese Method**: Poke holes in the task by doing any small part that feels easy right now.",
            "**Break It Down**: Let's split this into 15-minute chunks together."
        ]
    },
    unclear: {
        name: "Task is unclear or confusing",
        questions: [
            "What part is unclear? Is it what to do, or how to do it?",
            "Do you need information from someone before you can start?"
        ],
        strategies: [
            "**Clarify First**: The actual first step might be 'Figure out X' or 'Ask [person] about Y'.",
            "**Draft Mode**: Start with a rough draft or outline. It doesn't have to be right, just started.",
            "**Rubber Duck It**: Explain the task out loud (or to me) - often clarity comes from talking it through.",
            "**Define Done**: What would 'done' look like? Sometimes working backwards helps."
        ]
    },
    boring: {
        name: "Task is boring or tedious",
        questions: [
            "Would music or background noise help?",
            "Can you pair this with something enjoyable?"
        ],
        strategies: [
            "**Body Doubling**: I'll stay here while you work. Just knowing someone's 'here' can help.",
            "**Gamify It**: Set a timer - can you beat your own record?",
            "**Stack It**: Pair with a podcast, music, or something you enjoy.",
            "**Reward Yourself**: What treat do you get when this is done? Define it now.",
            "**Pomodoro Power**: 25 minutes of work, then a 5-minute break. Rinse and repeat."
        ]
    },
    scary: {
        name: "Fear of failure or judgment",
        questions: [
            "What's the worst that could happen if it's not perfect?",
            "Are you worried about what someone will think?"
        ],
        strategies: [
            "**Permission to Suck**: Your first draft can be terrible. Done is better than perfect.",
            "**Separate Thinking from Doing**: First brainstorm/outline (no judgment), then execute.",
            "**Lower the Stakes**: This is a draft, a prototype, a first attempt. It's SUPPOSED to be imperfect.",
            "**Fear-Setting**: What's the actual worst case? Usually it's not that bad when you write it out."
        ]
    },
    blocked: {
        name: "Waiting on something or someone",
        questions: [
            "What exactly are you waiting for?",
            "Is there any part you CAN do while waiting?"
        ],
        strategies: [
            "**Unblock It**: Can you send that email/message/request right now to get it moving?",
            "**Work Around**: What parts of this task don't depend on the blocker?",
            "**Escalate**: If this has been stuck too long, who can help unstick it?",
            "**Temporary Block**: Mark it as 'Waiting On' and work on something else guilt-free."
        ]
    },
    distracted: {
        name: "Can't focus, getting distracted",
        questions: [
            "What's pulling your attention away?",
            "Is there something on your mind that needs to be captured first?"
        ],
        strategies: [
            "**Brain Dump First**: Dump everything on your mind into a list, then come back to this task.",
            "**Phone Away**: Put your phone in another room or use an app blocker.",
            "**Environment Check**: Is your space set up for focus? Sometimes moving locations helps.",
            "**Close All Tabs**: Nuclear option - close everything except what you need for this one task.",
            "**Body Doubling**: Work alongside me - I'll check in periodically to keep you accountable."
        ]
    },
    low_energy: {
        name: "Too tired or low energy",
        questions: [
            "Have you eaten recently? Had water?",
            "Is this the right time of day for this type of task?"
        ],
        strategies: [
            "**Basic Needs Check**: Water, food, movement. Sometimes that's all you need.",
            "**Match Energy to Task**: Maybe this isn't the right task for right now. What's a low-energy task you could do instead?",
            "**5-Minute Movement**: A quick walk, stretch, or even just standing up can help.",
            "**Reschedule Guilt-Free**: If you're genuinely exhausted, maybe this task should wait for a better time."
        ]
    },
    overwhelmed: {
        name: "Too many things, feeling overwhelmed",
        questions: [
            "How many things are competing for your attention right now?",
            "Can we just pick ONE thing to focus on?"
        ],
        strategies: [
            "**One Thing**: Forget the list. What's the ONE thing you'll do in the next 30 minutes?",
            "**Brain Dump**: Get everything out of your head onto paper/screen. Just seeing it helps.",
            "**Ruthless Triage**: What MUST happen today? What can wait? What can be dropped entirely?",
            "**Breathe First**: Take 3 deep breaths. Overwhelm shrinks when you slow down."
        ]
    }
};

/**
 * Get coaching strategies for a specific avoidance reason
 */
function getStrategiesForAvoidance(avoidanceType) {
    return AVOIDANCE_STRATEGIES[avoidanceType] || AVOIDANCE_STRATEGIES.overwhelmed;
}

/**
 * Format the "what should I be doing" response with coaching
 */
function formatNowResponse(topTask, allEngagedTasks) {
    let message = `🎯 **What You Should Be Doing Right Now**\n\n`;

    if (!topTask) {
        message = `🎉 **You're all caught up!**\n\nNo urgent tasks right now. Would you like to:\n• Review your task list for what's coming up?\n• Do some planning for the week ahead?\n• Take a well-deserved break?\n\nWhat feels right?`;
        return {
            message,
            waitingFor: false
        };
    }

    message += `**The #1 priority:**\n`;
    message += `📌 **${topTask.title}**\n`;
    if (topTask.projectName) message += `   Project: ${topTask.projectName}\n`;
    if (topTask.dueDate) message += `   Due: ${topTask.dueDate}\n`;
    if (topTask.content) message += `   Note: ${topTask.content}\n`;
    message += `\n`;

    // Show other engaged tasks if any
    if (allEngagedTasks && allEngagedTasks.length > 1) {
        message += `**Also on deck (${allEngagedTasks.length - 1} more):**\n`;
        allEngagedTasks.slice(1, 4).forEach((task, i) => {
            message += `${i + 2}. ${task.title}\n`;
        });
        if (allEngagedTasks.length > 4) {
            message += `   ...and ${allEngagedTasks.length - 4} more\n`;
        }
        message += `\n`;
    }

    message += `---\n\n`;
    message += `**So, what are you actually doing right now?**\n\n`;
    message += `Be honest - no judgment here. Are you:\n`;
    message += `• Working on this task? (Great!)\n`;
    message += `• Doing something else? (Tell me what)\n`;
    message += `• Avoiding it? (Let's figure out why)\n`;

    return {
        message,
        waitingFor: true,
        focusSession: {
            active: true,
            state: 'asked_current_activity',
            intendedTask: topTask,
            startedAt: Date.now()
        }
    };
}

/**
 * Format the avoidance exploration response
 */
function formatAvoidanceExploration() {
    let message = `**I hear you. Let's figure out what's getting in the way.**\n\n`;
    message += `What's making this task hard to start? Pick the one that resonates most:\n\n`;
    message += `1️⃣ **Too big** - It feels overwhelming, don't know where to start\n`;
    message += `2️⃣ **Unclear** - Not sure what exactly to do or how to do it\n`;
    message += `3️⃣ **Boring** - It's tedious and my brain wants something more interesting\n`;
    message += `4️⃣ **Scary** - Worried about doing it wrong or being judged\n`;
    message += `5️⃣ **Blocked** - Waiting on something or someone\n`;
    message += `6️⃣ **Distracted** - Can't focus, mind keeps wandering\n`;
    message += `7️⃣ **Low energy** - Too tired to do this right now\n`;
    message += `8️⃣ **Overwhelmed** - Too many things competing for attention\n\n`;
    message += `Just type a number or describe what's going on.`;

    return {
        message,
        waitingFor: true,
        focusSession: {
            state: 'exploring_avoidance'
        }
    };
}

/**
 * Format coaching response based on avoidance type
 */
function formatCoachingResponse(avoidanceType, task) {
    const strategies = getStrategiesForAvoidance(avoidanceType);

    let message = `**Got it - ${strategies.name.toLowerCase()}.**\n\n`;
    message += `Here's what might help:\n\n`;

    strategies.strategies.forEach(strategy => {
        message += `${strategy}\n\n`;
    });

    message += `---\n\n`;
    message += `**Let's make a plan.** Which of these sounds doable right now?\n\n`;
    message += `Or tell me what would actually work for you - I'll help you set it up.`;

    return {
        message,
        waitingFor: true,
        focusSession: {
            state: 'planning',
            avoidanceReason: avoidanceType,
            suggestedStrategies: strategies.strategies
        }
    };
}

/**
 * Format the check-in response
 */
function formatCheckInResponse(focusSession) {
    const timeSinceStart = focusSession.startedAt
        ? Math.round((Date.now() - focusSession.startedAt) / 60000)
        : 0;

    let message = `⏰ **Check-in Time** (${timeSinceStart} minutes in)\n\n`;

    if (focusSession.intendedTask) {
        message += `You were working on: **${focusSession.intendedTask.title}**\n\n`;
    }

    message += `How's it going?\n\n`;
    message += `• **Making progress** - Keep going, you've got this!\n`;
    message += `• **Stuck again** - Let's troubleshoot\n`;
    message += `• **Finished!** - Time to celebrate\n`;
    message += `• **Gave up** - No judgment, let's figure out next steps\n`;
    message += `• **Got distracted** - Happens! Let's refocus\n`;

    return {
        message,
        waitingFor: true,
        focusSession: {
            state: 'checking_in'
        }
    };
}

/**
 * Format the session reflection response
 */
function formatReflectionResponse(focusSession, outcome) {
    let message = `**Session Reflection**\n\n`;

    if (outcome === 'finished') {
        message += `🎉 **You did it!** That's a win worth celebrating.\n\n`;
        message += `Before we move on:\n`;
        message += `• What helped you get it done?\n`;
        message += `• Any strategy that worked especially well?\n\n`;
        message += `This info helps me coach you better next time!`;
    } else if (outcome === 'gave_up') {
        message += `No judgment here. Sometimes we need to step back.\n\n`;
        message += `Let's learn from this:\n`;
        message += `• Was this the right task for right now?\n`;
        message += `• Should we break it down differently?\n`;
        message += `• Reschedule for a better time?\n`;
    } else {
        message += `Let's capture what happened so we can do better next time.\n\n`;
        message += `What would you do differently?`;
    }

    return {
        message,
        waitingFor: true,
        focusSession: {
            state: 'reflecting'
        }
    };
}

module.exports = {
    respondToCommand,
    getPendingCommands,
    formatFocusResponse,
    // Focus session management
    getFocusSession,
    updateFocusSession,
    clearFocusSession,
    createFocusSession,
    // ADHD coaching
    AVOIDANCE_STRATEGIES,
    getStrategiesForAvoidance,
    // Response formatters
    formatNowResponse,
    formatAvoidanceExploration,
    formatCoachingResponse,
    formatCheckInResponse,
    formatReflectionResponse
};
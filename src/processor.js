#!/usr/bin/env node
/**
 * Auto Processor for Executive Brain
 *
 * Watches the command queue and automatically processes commands
 * using the TickTick API endpoints on the bridge server.
 *
 * This provides fully automated responses without manual intervention.
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

// Project root directory (one level up from src/)
const ROOT_DIR = path.join(__dirname, '..');

const COMMAND_QUEUE = path.join(ROOT_DIR, '.command-queue.json');
const RESPONSE_FILE = path.join(ROOT_DIR, '.command-responses.json');
const MEMORIES_FILE = path.join(ROOT_DIR, 'data', 'memories.json');
const REVIEW_SESSION_FILE = path.join(ROOT_DIR, '.review-session.json');
const BRIDGE_URL = 'http://localhost:3001';

let lastProcessedTimestamp = 0;
let isProcessing = false;

function log(msg) {
    console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

// ============================================================
// REVIEW SYSTEM - Handles missed task review before optimization
// ============================================================

// Avoidance types with descriptions
const AVOIDANCE_TYPES = {
    'too_big': { label: 'Too Big', description: 'Task feels overwhelming, don\'t know where to start' },
    'unclear': { label: 'Unclear', description: 'Not sure what to do or how to do it' },
    'boring': { label: 'Boring', description: 'Task is tedious, brain wants something else' },
    'scary': { label: 'Scary', description: 'Worried about doing it wrong or failing' },
    'blocked': { label: 'Blocked', description: 'Waiting on someone or something' },
    'distracted': { label: 'Distracted', description: 'Couldn\'t focus, mind kept wandering' },
    'low_energy': { label: 'Low Energy', description: 'Too tired, not enough mental capacity' },
    'overwhelmed': { label: 'Overwhelmed', description: 'Too many things competing for attention' },
    'forgot': { label: 'Forgot', description: 'Simply forgot about it' },
    'interruptions': { label: 'Interruptions', description: 'Kept getting interrupted' },
    'other': { label: 'Other', description: 'Something else (please explain)' }
};

// Load memories
function loadMemories() {
    if (fs.existsSync(MEMORIES_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(MEMORIES_FILE, 'utf8'));
        } catch (e) {
            log(`⚠️ Error loading memories: ${e.message}`);
            return { strategies: [], taskHistory: {}, reviewSessions: [] };
        }
    }
    return { strategies: [], taskHistory: {}, reviewSessions: [] };
}

// Save memories
function saveMemories(memories) {
    memories.lastUpdated = new Date().toISOString();
    fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memories, null, 2));
}

// Load review session
function loadReviewSession() {
    if (fs.existsSync(REVIEW_SESSION_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(REVIEW_SESSION_FILE, 'utf8'));
        } catch (e) {
            return null;
        }
    }
    return null;
}

// Save review session
function saveReviewSession(session) {
    fs.writeFileSync(REVIEW_SESSION_FILE, JSON.stringify(session, null, 2));
}

// Clear review session
function clearReviewSession() {
    if (fs.existsSync(REVIEW_SESSION_FILE)) {
        fs.unlinkSync(REVIEW_SESSION_FILE);
    }
}

// Get strategies for an avoidance type, sorted by score
function getStrategiesForAvoidance(avoidanceType, taskId = null) {
    const memories = loadMemories();
    const strategies = memories.strategies || [];

    // Filter by applicable avoidance type
    let applicable = strategies.filter(s =>
        s.applicableTo && s.applicableTo.includes(avoidanceType)
    );

    // Check task history for previously failed strategies
    const taskHistory = memories.taskHistory || {};
    const thisTaskHistory = taskHistory[taskId] || { strategiesAttempted: [] };
    const failedStrategies = thisTaskHistory.strategiesAttempted
        .filter(a => a.result === 'failure')
        .map(a => a.strategyId);

    // Sort by score (highest first), deprioritize failed ones
    applicable.sort((a, b) => {
        const aFailed = failedStrategies.includes(a.id);
        const bFailed = failedStrategies.includes(b.id);

        // Failed strategies go to bottom
        if (aFailed && !bFailed) return 1;
        if (!aFailed && bFailed) return -1;

        // Otherwise sort by score
        return (b.score || 0) - (a.score || 0);
    });

    return {
        strategies: applicable,
        failedStrategies,
        taskHistory: thisTaskHistory
    };
}

// Record strategy outcome
function recordStrategyOutcome(strategyId, taskId, taskTitle, avoidanceType, result, notes = '') {
    const memories = loadMemories();

    // Update strategy score and outcomes
    const strategy = memories.strategies.find(s => s.id === strategyId);
    if (strategy) {
        const scoreChange = result === 'success' ? 3 : result === 'partial' ? 1 : -1;
        strategy.score = (strategy.score || 0) + scoreChange;

        strategy.outcomes = strategy.outcomes || [];
        strategy.outcomes.push({
            date: new Date().toISOString().split('T')[0],
            result,
            taskContext: taskTitle,
            taskId,
            avoidanceType,
            notes
        });

        // Keep only last 50 outcomes per strategy
        if (strategy.outcomes.length > 50) {
            strategy.outcomes = strategy.outcomes.slice(-50);
        }
    }

    // Update task history
    memories.taskHistory = memories.taskHistory || {};
    memories.taskHistory[taskId] = memories.taskHistory[taskId] || {
        title: taskTitle,
        strategiesAttempted: []
    };

    memories.taskHistory[taskId].strategiesAttempted.push({
        strategyId,
        date: new Date().toISOString().split('T')[0],
        result,
        avoidanceType,
        notes
    });

    saveMemories(memories);
    log(`📊 Recorded ${result} outcome for strategy "${strategyId}" on task "${taskTitle}"`);
}

// Add a new custom strategy
function addCustomStrategy(name, description, applicableTo) {
    const memories = loadMemories();
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Check if already exists
    if (memories.strategies.find(s => s.id === id)) {
        return null;
    }

    const newStrategy = {
        id,
        name,
        description,
        applicableTo,
        score: 0,
        outcomes: [],
        tweaks: [],
        escalations: [],
        isCustom: true
    };

    memories.strategies.push(newStrategy);
    saveMemories(memories);

    return newStrategy;
}

// Detect missed tasks (scheduled but not completed)
function detectMissedTasks(tasks) {
    const now = new Date();
    const missed = [];

    for (const task of tasks) {
        // Skip completed tasks
        if (task.status === 2) continue;

        // Check if task had a start time that has passed
        if (task.startDate) {
            const startDate = new Date(task.startDate);
            const taskEndTime = new Date(startDate);

            // Assume 30 min duration if not specified
            const duration = task._metadata?.duration || 30;
            taskEndTime.setMinutes(taskEndTime.getMinutes() + duration);

            // Task's scheduled time has fully passed
            if (taskEndTime < now) {
                missed.push({
                    id: task.id,
                    title: task.title,
                    projectId: task.projectId,
                    projectName: task.projectName,
                    scheduledStart: task.startDate,
                    scheduledEnd: taskEndTime.toISOString()
                });
            }
        }
    }

    return missed;
}

// Format avoidance options for display
function formatAvoidanceOptions() {
    let options = '\n';
    const types = Object.entries(AVOIDANCE_TYPES);
    types.forEach(([key, val], index) => {
        options += `**${index + 1}.** ${val.label} - ${val.description}\n`;
    });
    return options;
}

// Parse avoidance type from user input
function parseAvoidanceInput(input) {
    const lowerInput = input.toLowerCase().trim();

    // Check for number input (1-11)
    const num = parseInt(lowerInput);
    if (num >= 1 && num <= 11) {
        const keys = Object.keys(AVOIDANCE_TYPES);
        return keys[num - 1];
    }

    // Check for keyword matches
    for (const [key, val] of Object.entries(AVOIDANCE_TYPES)) {
        if (lowerInput.includes(key) || lowerInput.includes(val.label.toLowerCase())) {
            return key;
        }
    }

    // Common phrases
    if (lowerInput.includes('big') || lowerInput.includes('overwhelm')) return 'too_big';
    if (lowerInput.includes('confus') || lowerInput.includes('unclear')) return 'unclear';
    if (lowerInput.includes('boring') || lowerInput.includes('tedious')) return 'boring';
    if (lowerInput.includes('scar') || lowerInput.includes('afraid') || lowerInput.includes('fail')) return 'scary';
    if (lowerInput.includes('block') || lowerInput.includes('wait')) return 'blocked';
    if (lowerInput.includes('distract') || lowerInput.includes('social media') || lowerInput.includes('phone')) return 'distracted';
    if (lowerInput.includes('tired') || lowerInput.includes('energy') || lowerInput.includes('exhaust')) return 'low_energy';
    if (lowerInput.includes('too many') || lowerInput.includes('overwhelm')) return 'overwhelmed';
    if (lowerInput.includes('forgot')) return 'forgot';
    if (lowerInput.includes('interrupt')) return 'interruptions';

    return 'other';
}

// Format strategies for display
function formatStrategiesForDisplay(strategies, failedStrategies = []) {
    let msg = '';

    strategies.slice(0, 5).forEach((s, i) => {
        const wasFailed = failedStrategies.includes(s.id);
        const scoreIndicator = s.score > 5 ? '⭐' : s.score > 0 ? '✓' : '';
        const failedIndicator = wasFailed ? ' ⚠️ (tried before)' : '';

        msg += `**${i + 1}.** ${s.name} ${scoreIndicator}${failedIndicator}\n`;
        msg += `   ${s.description}\n\n`;
    });

    return msg;
}

// Review flow state machine
async function processReviewFlow(cmd) {
    const session = loadReviewSession();

    if (!session) {
        log('⚠️ No active review session');
        return null;
    }

    const userInput = (cmd.fullCommand || cmd.command || '').toLowerCase().trim();

    switch (session.state) {
        case 'asking_if_done':
            return handleAskingIfDone(session, userInput);

        case 'asking_why':
            return handleAskingWhy(session, userInput);

        case 'suggesting_strategy':
            return handleStrategySelection(session, userInput, cmd);

        case 'recording_outcome':
            return handleRecordingOutcome(session, userInput);

        case 'asking_custom_strategy':
            return handleCustomStrategy(session, userInput);

        default:
            clearReviewSession();
            return null;
    }
}

async function handleAskingIfDone(session, userInput) {
    const currentTask = session.missedTasks[session.currentIndex];

    // Check for yes/done/complete
    if (userInput.includes('yes') || userInput.includes('done') || userInput.includes('finish') || userInput.includes('complete')) {
        // Mark task as complete in TickTick
        try {
            await tickTickCall('ticktick_complete_task', {
                task_id: currentTask.id,
                project_id: currentTask.projectId
            });
            log(`✅ Marked "${currentTask.title}" as complete`);
        } catch (e) {
            log(`⚠️ Could not mark task complete: ${e.message}`);
        }

        // Move to next task or finish
        return moveToNextTaskOrFinish(session, `Great! **"${currentTask.title}"** marked as complete! 🎉\n\n`);
    }

    // Task not done - ask why
    session.state = 'asking_why';
    session.currentTaskNotDone = true;
    saveReviewSession(session);

    return {
        message: `Got it - **"${currentTask.title}"** didn't get done.

**No judgment.** Let's figure out what got in the way so we can fix it.

What happened? Pick the one that resonates most:
${formatAvoidanceOptions()}
Or just describe what happened in your own words.`,
        waitingFor: true,
        status: 'success',
        reviewSession: session
    };
}

async function handleAskingWhy(session, userInput) {
    const currentTask = session.missedTasks[session.currentIndex];
    const avoidanceType = parseAvoidanceInput(userInput);

    session.currentAvoidanceType = avoidanceType;
    session.currentAvoidanceInput = userInput;

    // Get strategies for this avoidance type
    const { strategies, failedStrategies, taskHistory } = getStrategiesForAvoidance(avoidanceType, currentTask.id);

    // Check if we have previously failed strategies for this task
    const previousAttempts = taskHistory.strategiesAttempted || [];
    const hasFailedBefore = previousAttempts.some(a => a.result === 'failure');

    let message = '';

    if (avoidanceType === 'other') {
        message = `Thanks for sharing. Sometimes it's hard to categorize.

Based on what you said, here are some strategies that might help:
${formatStrategiesForDisplay(strategies.slice(0, 3), failedStrategies)}
**Type the number** of the strategy you want to try, or **"custom"** to suggest your own.`;
    } else {
        const avoidanceLabel = AVOIDANCE_TYPES[avoidanceType].label;

        if (hasFailedBefore) {
            // Check what escalations are available
            const lastFailedStrategy = previousAttempts.filter(a => a.result === 'failure').pop();
            const failedStrategyObj = strategies.find(s => s.id === lastFailedStrategy?.strategyId);
            const escalations = failedStrategyObj?.escalations || [];

            message = `**"${avoidanceLabel}"** - I see this happened before with this task.

`;
            if (escalations.length > 0) {
                const memories = loadMemories();
                const escalationStrategies = escalations
                    .map(id => memories.strategies.find(s => s.id === id))
                    .filter(Boolean);

                message += `Since **"${failedStrategyObj?.name}"** didn't work last time, let's try something stronger:

${formatStrategiesForDisplay(escalationStrategies, failedStrategies)}`;
            } else {
                message += `Let's try a different approach:

${formatStrategiesForDisplay(strategies.filter(s => !failedStrategies.includes(s.id)), failedStrategies)}`;
            }
        } else {
            message = `**"${avoidanceLabel}"** - I get it. Here are strategies that work well for this:

${formatStrategiesForDisplay(strategies, failedStrategies)}`;
        }

        message += `**Type the number** to choose, or **"custom"** to suggest your own strategy.`;
    }

    session.state = 'suggesting_strategy';
    session.availableStrategies = strategies;
    saveReviewSession(session);

    return {
        message,
        waitingFor: true,
        status: 'success',
        reviewSession: session
    };
}

async function handleStrategySelection(session, userInput, cmd) {
    const currentTask = session.missedTasks[session.currentIndex];

    // Check for custom strategy request
    if (userInput.includes('custom') || userInput.includes('my own') || userInput.includes('suggest')) {
        session.state = 'asking_custom_strategy';
        saveReviewSession(session);

        return {
            message: `Great! Tell me your strategy idea.

What do you think would help you complete **"${currentTask.title}"**?

Just describe it - I'll save it for future use.`,
            waitingFor: true,
            status: 'success',
            reviewSession: session
        };
    }

    // Parse strategy number
    const num = parseInt(userInput);
    let selectedStrategy = null;

    if (num >= 1 && num <= 5 && session.availableStrategies) {
        selectedStrategy = session.availableStrategies[num - 1];
    } else {
        // Try to match by name
        selectedStrategy = session.availableStrategies?.find(s =>
            userInput.includes(s.name.toLowerCase()) || userInput.includes(s.id)
        );
    }

    if (!selectedStrategy) {
        return {
            message: `I didn't catch that. Please type a number (1-5) or "custom" to suggest your own.`,
            waitingFor: true,
            status: 'success',
            reviewSession: session
        };
    }

    // Record strategy choice and move to next task
    session.currentStrategy = selectedStrategy;

    // Add strategy to task metadata in TickTick
    try {
        await tickTickCall('ticktick_update_task', {
            task_id: currentTask.id,
            project_id: currentTask.projectId,
            content: `Strategy: ${selectedStrategy.name}\nAvoidance: ${session.currentAvoidanceType}`
        });
    } catch (e) {
        log(`⚠️ Could not update task with strategy: ${e.message}`);
    }

    // Record that we're trying this strategy (outcome will be recorded later)
    recordStrategyOutcome(
        selectedStrategy.id,
        currentTask.id,
        currentTask.title,
        session.currentAvoidanceType,
        'pending',
        'Strategy chosen during review'
    );

    const prefix = `Got it! For **"${currentTask.title}"**, you'll try: **${selectedStrategy.name}**

💡 *${selectedStrategy.description}*

`;

    return moveToNextTaskOrFinish(session, prefix);
}

async function handleCustomStrategy(session, userInput) {
    const currentTask = session.missedTasks[session.currentIndex];

    // Create custom strategy
    const customStrategy = addCustomStrategy(
        userInput.substring(0, 50), // Truncate name
        userInput,
        [session.currentAvoidanceType]
    );

    if (customStrategy) {
        recordStrategyOutcome(
            customStrategy.id,
            currentTask.id,
            currentTask.title,
            session.currentAvoidanceType,
            'pending',
            'Custom strategy created during review'
        );

        const prefix = `Created new strategy: **${customStrategy.name}**

I'll track how well this works for you!

`;
        return moveToNextTaskOrFinish(session, prefix);
    }

    const prefix = `Got it - I'll remember this approach for "${currentTask.title}".

`;
    return moveToNextTaskOrFinish(session, prefix);
}

async function moveToNextTaskOrFinish(session, messagePrefix = '') {
    session.currentIndex++;

    if (session.currentIndex >= session.missedTasks.length) {
        // All tasks reviewed - proceed to optimization
        clearReviewSession();

        return {
            message: messagePrefix + `✅ **Review Complete!**

All missed tasks have been reviewed. Now optimizing your schedule...`,
            waitingFor: false,
            status: 'success',
            reviewComplete: true,
            proceedToOptimize: true
        };
    }

    // Move to next task
    const nextTask = session.missedTasks[session.currentIndex];
    session.state = 'asking_if_done';
    saveReviewSession(session);

    return {
        message: messagePrefix + `---

📋 **Task ${session.currentIndex + 1} of ${session.missedTasks.length}**

**"${nextTask.title}"** was scheduled for ${formatTime(nextTask.scheduledStart)}

Did you finish this one?
• **Yes** - I completed it
• **No** - I didn't get to it`,
        waitingFor: true,
        status: 'success',
        reviewSession: session
    };
}

function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// Load responses file
function loadResponses() {
    if (fs.existsSync(RESPONSE_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(RESPONSE_FILE, 'utf8'));
        } catch (e) {
            return {};
        }
    }
    return {};
}

// Save response
function saveResponse(commandId, response) {
    const responses = loadResponses();
    responses[commandId] = {
        response,
        timestamp: Date.now()
    };
    fs.writeFileSync(RESPONSE_FILE, JSON.stringify(responses, null, 2));
    log(`✅ Saved response for ${commandId}`);
}

// Call TickTick API via bridge server
async function tickTickCall(endpoint, body = {}) {
    try {
        const response = await fetch(`${BRIDGE_URL}/api/ticktick/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (data.success) {
            return data.result;
        }
        throw new Error(data.error || 'Unknown error');
    } catch (e) {
        log(`❌ TickTick API error: ${e.message}`);
        return null;
    }
}

// Format task for display
function formatTask(task, index) {
    const priority = task.priority === 5 ? '🔴' : task.priority === 3 ? '🟡' : '⚪';
    const due = task.dueDate ? ` (due: ${task.dueDate.split('T')[0]})` : '';
    return `${index}. ${priority} **${task.title}**${due}\n   └ ${task.projectName || 'No project'}`;
}

// Process /now command
async function processNow(cmd) {
    log('Processing /now command...');

    const tasks = await tickTickCall('ticktick_get_engaged_tasks');

    if (!tasks || tasks.length === 0) {
        return {
            message: `🎯 **Nothing Urgent Right Now!**

No high-priority, overdue, or due-today tasks found.

**Options:**
• Check your full task list in TickTick
• Use **/morning** to plan your day
• Enjoy the moment of clarity!`,
            waitingFor: false,
            status: 'success'
        };
    }

    // Sort: overdue first, then by priority
    tasks.sort((a, b) => {
        const today = new Date().toISOString().split('T')[0];
        const aOverdue = a.dueDate && a.dueDate < today ? 1 : 0;
        const bOverdue = b.dueDate && b.dueDate < today ? 1 : 0;
        if (aOverdue !== bOverdue) return bOverdue - aOverdue;
        return (b.priority || 0) - (a.priority || 0);
    });

    const topTask = tasks[0];
    const otherTasks = tasks.slice(1, 4);

    let message = `🎯 **What You Should Be Doing Right Now**

**The #1 priority:**
📌 **${topTask.title}**
   Project: ${topTask.projectName || 'None'}
   ${topTask.dueDate ? `Due: ${topTask.dueDate.split('T')[0]}` : 'No due date'}
`;

    if (otherTasks.length > 0) {
        message += `\n**Also on deck (${tasks.length - 1} more):**\n`;
        otherTasks.forEach((task, i) => {
            message += formatTask(task, i + 2) + '\n';
        });
    }

    message += `
---

**So, what are you actually doing right now?**

Be honest - no judgment here. Are you:
• Working on this task? (Great!)
• Doing something else? (Tell me what)
• Avoiding it? (Let's figure out why)`;

    return {
        message,
        waitingFor: true,
        status: 'success',
        focusSession: {
            active: true,
            state: 'asked_current_activity',
            intendedTask: {
                title: topTask.title,
                projectName: topTask.projectName,
                taskId: topTask.id,
                projectId: topTask.projectId
            },
            startedAt: Date.now()
        }
    };
}

// Process /morning command
async function processMorning(cmd) {
    log('Processing /morning command...');

    const [todayTasks, overdueTasks] = await Promise.all([
        tickTickCall('ticktick_get_tasks_due_today'),
        tickTickCall('ticktick_get_overdue_tasks')
    ]);

    let message = `☀️ **Good Morning! Let's Plan Your Day**

`;

    if (overdueTasks && overdueTasks.length > 0) {
        message += `⚠️ **Overdue Tasks (${overdueTasks.length}):**\n`;
        overdueTasks.slice(0, 3).forEach((task, i) => {
            message += formatTask(task, i + 1) + '\n';
        });
        message += '\n';
    }

    if (todayTasks && todayTasks.length > 0) {
        message += `📅 **Due Today (${todayTasks.length}):**\n`;
        todayTasks.slice(0, 5).forEach((task, i) => {
            message += formatTask(task, i + 1) + '\n';
        });
        message += '\n';
    }

    message += `---

**What are your top 3 priorities for today?**

(These should be the things that, if done, would make today successful)`;

    return {
        message,
        waitingFor: true,
        status: 'success'
    };
}

// Process /evening command
async function processEvening(cmd) {
    log('Processing /evening command...');

    const overdueTasks = await tickTickCall('ticktick_get_overdue_tasks');

    let message = `🌙 **Evening Review Time**

Let's close out the day properly.

`;

    if (overdueTasks && overdueTasks.length > 0) {
        message += `📋 **Tasks that didn't get done (${overdueTasks.length}):**\n`;
        overdueTasks.slice(0, 5).forEach((task, i) => {
            message += `${i + 1}. ${task.title}\n`;
        });
        message += '\n';
    }

    message += `---

**First question:** What was your biggest win today?

(Even small things count!)`;

    return {
        message,
        waitingFor: true,
        status: 'success'
    };
}

// Process /checkin command
async function processCheckin(cmd) {
    log('Processing /checkin command...');

    // Check if there's an active focus session
    const focusSession = cmd.focusSession;

    if (focusSession && focusSession.active) {
        const elapsed = Math.floor((Date.now() - focusSession.startedAt) / 60000);

        return {
            message: `⏰ **Check-in Time** (${elapsed} minutes in)

You were working on: **${focusSession.intendedTask?.title || 'your task'}**

How's it going?
• **Making progress** - Keep going!
• **Stuck** - Let's troubleshoot
• **Finished!** - Time to celebrate
• **Got distracted** - Let's refocus`,
            waitingFor: true,
            status: 'success'
        };
    }

    return {
        message: `⏰ **No active focus session**

Start one by asking **"What should I be doing?"** or type **/now**`,
        waitingFor: false,
        status: 'success'
    };
}

// Project keyword detection
const PROJECT_KEYWORDS = {
    '692cc2ab575c11180e5d9df0': { // Work
        keywords: ['work', 'meeting', 'pr', 'deploy', 'code', 'bug', 'feature', 'ticket', 'jira', 'sprint', 'standup', 'review'],
        name: '💻 Work',
        emoji: '💻'
    },
    '61e994808f08ba41391df204': { // Health
        keywords: ['doctor', 'gym', 'workout', 'exercise', 'health', 'medicine', 'appointment', 'therapy', 'dentist'],
        name: '💪 Health',
        emoji: '💪'
    },
    '620bd72b8f0824cbd37c5a33': { // Shopping
        keywords: ['buy', 'shop', 'order', 'amazon', 'grocery', 'groceries', 'store', 'purchase'],
        name: '🛍️ Shopping',
        emoji: '🛍️'
    },
    '61f800e78f08384612258479': { // Cleaning
        keywords: ['clean', 'organize', 'tidy', 'declutter', 'vacuum', 'laundry', 'dishes'],
        name: '🍋 Cleaning',
        emoji: '🍋'
    },
    '620282978f083846135d3c04': { // Maintenance
        keywords: ['fix', 'repair', 'maintain', 'maintenance', 'car', 'house', 'plumber', 'electrician'],
        name: '🔧 Maintenance',
        emoji: '🔧'
    },
    '61e997578f08ba41391e29e3': { // Relationships
        keywords: ['call', 'text', 'friend', 'family', 'mom', 'dad', 'birthday', 'gift', 'visit'],
        name: '👫 Relationships',
        emoji: '👫'
    },
    '61e997ea8f08ba41391e3488': { // Hobbies
        keywords: ['hobby', 'fun', 'play', 'game', 'movie', 'book', 'read', 'watch', 'leisure'],
        name: '🧗🏻 Hobbies',
        emoji: '🧗🏻'
    },
    '61eaa26ade5e11185de999de': { // Finances
        keywords: ['pay', 'bill', 'money', 'bank', 'budget', 'finance', 'tax', 'invoice'],
        name: '💵 Finances',
        emoji: '💵'
    },
    '692cfb649dbb511e6fe1e9f3': { // Someday-Maybe
        keywords: ['someday', 'maybe', 'idea', 'consider', 'might'],
        name: '❓ Someday-Maybe',
        emoji: '❓'
    }
};

// Detect project from task text
function detectProject(text) {
    const lowerText = text.toLowerCase();

    for (const [projectId, config] of Object.entries(PROJECT_KEYWORDS)) {
        for (const keyword of config.keywords) {
            if (lowerText.includes(keyword)) {
                return { projectId, ...config };
            }
        }
    }

    // Default to Work for unrecognized tasks
    return {
        projectId: '692cc2ab575c11180e5d9df0',
        name: '💻 Work',
        emoji: '💻',
        keywords: []
    };
}

// Estimate if task is big (needs breakdown)
function estimateTaskSize(text) {
    const bigTaskIndicators = [
        'finish', 'complete', 'build', 'create', 'implement', 'design',
        'write', 'develop', 'set up', 'setup', 'migrate', 'refactor',
        'plan', 'organize', 'prepare', 'research'
    ];

    const lowerText = text.toLowerCase();
    return bigTaskIndicators.some(indicator => lowerText.includes(indicator));
}

// Process /add command
async function processAdd(cmd) {
    log('Processing /add command...');

    // Extract the task text (remove /add prefix if present)
    let taskText = cmd.fullCommand || cmd.command || '';
    taskText = taskText.replace(/^\/add\s*/i, '').trim();

    // Also handle natural language prefixes
    taskText = taskText
        .replace(/^i need to\s*/i, '')
        .replace(/^remind me to\s*/i, '')
        .replace(/^add task\s*/i, '')
        .replace(/^create task\s*/i, '')
        .replace(/^new task\s*/i, '')
        .replace(/^todo:\s*/i, '')
        .replace(/^task:\s*/i, '')
        .trim();

    // If no task text provided, prompt for it
    if (!taskText) {
        return {
            message: `➕ **Add a Task**

What do you need to do? Just describe it:

Examples:
• "Finish the quarterly report"
• "Call mom for her birthday"
• "Buy groceries"
• "Fix the login bug"

I'll help you capture it properly!`,
            waitingFor: true,
            status: 'success',
            addSession: {
                active: true,
                state: 'waiting_for_task'
            }
        };
    }

    // Detect project
    const project = detectProject(taskText);
    const isBigTask = estimateTaskSize(taskText);

    // Create the task
    try {
        const result = await tickTickCall('ticktick_create_task', {
            title: taskText,
            project_id: project.projectId,
            priority: 0 // Default priority
        });

        if (result && result.id) {
            let message = `✅ **Task Added!**

**"${taskText}"**
📁 Project: ${project.name}
⚡ Priority: None (adjust in TickTick if needed)

`;

            if (isBigTask) {
                message += `⚠️ **This looks like a bigger task.** Consider breaking it down into smaller steps (15-30 min each).

`;
            }

            message += `**What now?**
• Type **/now** to see your priorities
• Add another task
• Tell me if you want to start working on it`;

            return {
                message,
                waitingFor: false,
                status: 'success',
                createdTask: {
                    id: result.id,
                    title: taskText,
                    projectId: project.projectId,
                    projectName: project.name
                }
            };
        } else {
            throw new Error('No task ID returned');
        }
    } catch (e) {
        log(`❌ Failed to create task: ${e.message}`);
        return {
            message: `❌ **Couldn't add task**

Error: ${e.message}

Try again or check your TickTick connection.`,
            waitingFor: false,
            status: 'error'
        };
    }
}

// ============================================================
// INTELLIGENT SCHEDULE OPTIMIZATION
// ============================================================

const WORK_PROJECT_ID = '692cc2ab575c11180e5d9df0';
const ROUTINES_PROJECT_ID = '61e863eb8f08484e9018fa6e';

// Day structure (matches schedule.html defaults)
const DAY_STRUCTURE = {
    workStart: 8 * 60,      // 8:00 AM
    workEnd: 17 * 60,       // 5:00 PM (work tasks only before this)
    personalEnd: 20 * 60 + 30, // 8:30 PM (personal tasks allowed until)
    shutdownStart: 20 * 60 + 30 // 8:30 PM (no tasks after this)
};

// Keywords that indicate an event (meeting, appointment, etc.)
const EVENT_KEYWORDS = [
    'meeting', 'call', 'appointment', 'interview', 'standup',
    'sync', 'review', '1:1', 'one-on-one', 'demo', 'presentation',
    'doctor', 'dentist', 'therapy', 'session', 'class', 'webinar'
];

// ============================================================
// TYPE DETECTION SYSTEM
// Determines if item is: 'routine' | 'event' | 'task'
// ============================================================

function detectItemType(task) {
    // 1. Check explicit type metadata in content
    if (task.content) {
        const typeMatch = task.content.match(/type:(routine|event|task)/i);
        if (typeMatch) {
            return typeMatch[1].toLowerCase();
        }
    }

    // 2. Check if from Routines project
    if (task.projectId === ROUTINES_PROJECT_ID) {
        return 'routine';
    }

    // 3. Check for event keywords in title
    const titleLower = (task.title || '').toLowerCase();
    const hasEventKeyword = EVENT_KEYWORDS.some(keyword => titleLower.includes(keyword));

    // 4. Check time pattern: specific start time + reasonable duration = likely event
    if (task.startDate) {
        const hasSpecificStartTime = true; // Has a scheduled start

        // If it has event keywords AND a start time, it's an event
        if (hasEventKeyword && hasSpecificStartTime) {
            return 'event';
        }

        // If start and due are same day and close together, likely event
        if (task.dueDate) {
            const start = new Date(task.startDate);
            const due = new Date(task.dueDate);
            const durationHours = (due - start) / (1000 * 60 * 60);

            // Same day, specific duration <= 4 hours, has event-like keyword
            if (start.toDateString() === due.toDateString() &&
                durationHours > 0 && durationHours <= 4 &&
                hasEventKeyword) {
                return 'event';
            }
        }
    }

    // 5. Default: it's a task (flexible, can be rescheduled)
    return 'task';
}

// Kanban column definitions for Work project
const KANBAN_COLUMNS = {
    BACKLOG: 'backlog',      // Future tasks, no specific date
    READY: 'ready',          // Next up, has deadline but not scheduled
    IN_PROGRESS: 'in_progress', // Currently working on or planned for today
    WAITING: 'waiting',      // Blocked by someone else
    DONE: 'done'             // Completed
};

// Keywords that indicate a task is waiting/blocked
const WAITING_KEYWORDS = [
    'blocked by', 'waiting on', 'waiting for', 'depends on',
    'need.*approval', 'pending review', 'awaiting'
];

// Determine Kanban column for a work task
function determineKanbanColumn(task, metadata) {
    const content = (task.content || '').toLowerCase();
    const title = (task.title || '').toLowerCase();
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // 1. Check for explicit kanban metadata in content
    if (task.content) {
        const kanbanMatch = task.content.match(/kanban:(backlog|ready|in_progress|waiting|done)/i);
        if (kanbanMatch) {
            return kanbanMatch[1].toLowerCase();
        }
    }

    // 2. Check if task is completed
    if (task.status === 2) {
        return KANBAN_COLUMNS.DONE;
    }

    // 3. Check for waiting/blocked indicators
    const isWaiting = WAITING_KEYWORDS.some(keyword => {
        const regex = new RegExp(keyword, 'i');
        return regex.test(content) || regex.test(title);
    });
    if (isWaiting) {
        return KANBAN_COLUMNS.WAITING;
    }

    // 4. Check if scheduled for today (In Progress)
    if (task.startDate) {
        const startDate = new Date(task.startDate).toISOString().split('T')[0];
        if (startDate === today) {
            return KANBAN_COLUMNS.IN_PROGRESS;
        }
    }

    // 5. Check if due today or overdue (In Progress - urgent)
    if (task.dueDate) {
        const dueDate = new Date(task.dueDate).toISOString().split('T')[0];
        if (dueDate <= today) {
            return KANBAN_COLUMNS.IN_PROGRESS;
        }
        // Has a due date in the future = Ready
        return KANBAN_COLUMNS.READY;
    }

    // 6. No due date = Backlog
    return KANBAN_COLUMNS.BACKLOG;
}

// Parse task metadata from content field
function parseTaskMetadata(task) {
    const itemType = detectItemType(task);

    const metadata = {
        duration: 30,
        estimatedDuration: null,
        trueDeadline: null,
        isWork: task.projectId === WORK_PROJECT_ID,
        type: itemType,
        isFixed: itemType === 'routine' || itemType === 'event',
        kanbanColumn: null // Will be set below for work tasks
    };

    if (task.content) {
        const durationMatch = task.content.match(/duration:(\d+)/);
        if (durationMatch) metadata.duration = parseInt(durationMatch[1]);

        const deadlineMatch = task.content.match(/trueDeadline:([^\n]+)/);
        if (deadlineMatch) metadata.trueDeadline = new Date(deadlineMatch[1].trim());
    }

    if (!metadata.trueDeadline && task.dueDate) {
        metadata.trueDeadline = new Date(task.dueDate);
    }

    // Determine Kanban column for work tasks
    if (metadata.isWork) {
        metadata.kanbanColumn = determineKanbanColumn(task, metadata);
    }

    return metadata;
}

// Calculate priority score (now includes Kanban column weighting)
function calculatePriorityScore(task) {
    let score = 0;
    const now = new Date();
    const metadata = parseTaskMetadata(task);

    // Base priority from TickTick (High=5, Medium=3, Low=1)
    score += (task.priority || 0) * 20;

    // Deadline urgency
    if (metadata.trueDeadline) {
        const daysUntilDue = (metadata.trueDeadline - now) / (1000 * 60 * 60 * 24);
        if (daysUntilDue < 0) score += 150;      // Overdue
        else if (daysUntilDue < 1) score += 100; // Due today
        else if (daysUntilDue < 3) score += 75;  // Due soon
    }

    // Kanban column weighting (for work tasks)
    if (metadata.kanbanColumn) {
        switch (metadata.kanbanColumn) {
            case KANBAN_COLUMNS.IN_PROGRESS:
                score += 200; // Highest priority - actively working
                break;
            case KANBAN_COLUMNS.READY:
                score += 100; // Next up
                break;
            case KANBAN_COLUMNS.BACKLOG:
                score += 25;  // Future tasks
                break;
            case KANBAN_COLUMNS.WAITING:
                score -= 50;  // Deprioritize - can't work on these
                break;
            case KANBAN_COLUMNS.DONE:
                score = -1000; // Should not be scheduled
                break;
        }
    }

    return score;
}

// Get current time in minutes from midnight
function getCurrentMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
}

// Check if a date is a weekend (Saturday = 6, Sunday = 0)
function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
}

// Check if today is a weekend
function isTodayWeekend() {
    return isWeekend(new Date());
}

// Get the next workday (Monday if today is weekend, otherwise tomorrow or next Monday)
function getNextWorkday(fromDate = new Date()) {
    const date = new Date(fromDate);
    date.setDate(date.getDate() + 1); // Start from tomorrow

    // Skip weekends
    while (isWeekend(date)) {
        date.setDate(date.getDate() + 1);
    }

    return date;
}

// Get days until next workday from today
function daysUntilNextWorkday() {
    const today = new Date();
    const nextWorkday = getNextWorkday(today);
    const diffTime = nextWorkday.setHours(0,0,0,0) - new Date().setHours(0,0,0,0);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Format minutes to ISO datetime for today
function minutesToISOToday(minutes) {
    const now = new Date();
    now.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return now.toISOString().replace('Z', '+0000');
}

// Format minutes to ISO datetime for a specific date offset
function minutesToISODate(minutes, daysFromToday) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromToday);
    date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return date.toISOString().replace('Z', '+0000');
}

// Format minutes to ISO datetime for next workday (skips weekends for work tasks)
function minutesToISONextWorkday(minutes) {
    const nextWorkday = getNextWorkday();
    nextWorkday.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return nextWorkday.toISOString().replace('Z', '+0000');
}

// Format minutes to ISO datetime for tomorrow (for personal tasks that can be on weekends)
function minutesToISOTomorrow(minutes) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return tomorrow.toISOString().replace('Z', '+0000');
}

// Find next available slot for a task
function findNextSlot(task, currentMinutes, occupiedSlots) {
    const metadata = parseTaskMetadata(task);
    const duration = metadata.duration || 30;
    const slotsNeeded = Math.ceil(duration / 10);

    // Determine zone constraints
    let searchStart, searchEnd, canScheduleToday;

    if (metadata.isWork) {
        // Work tasks: Can only be scheduled on weekdays
        if (isTodayWeekend()) {
            // Today is weekend - can't schedule work tasks today
            const nextWorkdayStart = DAY_STRUCTURE.workStart;
            return { slot: nextWorkdayStart, isToday: false, useNextWorkday: true };
        }

        searchStart = Math.max(currentMinutes, DAY_STRUCTURE.workStart);
        searchEnd = DAY_STRUCTURE.workEnd;
        canScheduleToday = true;
    } else {
        // Personal tasks: Can be scheduled any day
        searchStart = Math.max(currentMinutes, DAY_STRUCTURE.workEnd);
        searchEnd = DAY_STRUCTURE.personalEnd;
        canScheduleToday = true;
    }

    // Round up to next 10-minute slot
    searchStart = Math.ceil(searchStart / 10) * 10;

    // Search for available slot today (if allowed)
    if (canScheduleToday) {
        for (let slot = searchStart; slot + duration <= searchEnd; slot += 10) {
            let slotAvailable = true;
            for (let i = 0; i < slotsNeeded; i++) {
                if (occupiedSlots.has(slot + i * 10)) {
                    slotAvailable = false;
                    break;
                }
            }
            if (slotAvailable) {
                // Mark slots as occupied
                for (let i = 0; i < slotsNeeded; i++) {
                    occupiedSlots.add(slot + i * 10);
                }
                return { slot, isToday: true };
            }
        }
    }

    // No slot today - schedule for next available day
    if (metadata.isWork) {
        // Work tasks go to next workday (skip weekends)
        const nextWorkdayStart = DAY_STRUCTURE.workStart;
        return { slot: nextWorkdayStart, isToday: false, useNextWorkday: true };
    } else {
        // Personal tasks can go to tomorrow (even weekends)
        const tomorrowStart = DAY_STRUCTURE.workEnd;
        return { slot: tomorrowStart, isToday: false, useNextWorkday: false };
    }
}

// Process /optimize-schedule command
async function processOptimizeSchedule(cmd) {
    log('🧠 Optimizing schedule...');

    // ============================================================
    // PHASE 0: CHECK FOR ACTIVE REVIEW SESSION OR MISSED TASKS
    // Before showing schedule, we must review any missed tasks
    // ============================================================

    // Check if there's an active review session (user is mid-review)
    const existingSession = loadReviewSession();
    if (existingSession && existingSession.state) {
        log('📋 Active review session found, continuing...');
        return processReviewFlow(cmd);
    }

    // Get all engaged tasks
    const allItems = await tickTickCall('ticktick_get_engaged_tasks');

    if (!allItems || allItems.length === 0) {
        return {
            message: 'No items to optimize',
            tasks: [],
            changes: [],
            status: 'success'
        };
    }

    // Detect missed tasks (scheduled time passed, not completed)
    const missedTasks = detectMissedTasks(allItems);

    if (missedTasks.length > 0) {
        log(`⚠️ Found ${missedTasks.length} missed tasks - starting review`);

        // Create new review session
        const reviewSession = {
            state: 'asking_if_done',
            missedTasks,
            currentIndex: 0,
            startedAt: Date.now()
        };
        saveReviewSession(reviewSession);

        const firstTask = missedTasks[0];

        return {
            message: `⏰ **Before we optimize, let's review some tasks**

You had ${missedTasks.length} task${missedTasks.length > 1 ? 's' : ''} scheduled that ${missedTasks.length > 1 ? 'weren\'t' : 'wasn\'t'} marked complete.

---

📋 **Task 1 of ${missedTasks.length}**

**"${firstTask.title}"** was scheduled for ${formatTime(firstTask.scheduledStart)}

Did you finish this one?
• **Yes** - I completed it
• **No** - I didn't get to it`,
            waitingFor: true,
            status: 'success',
            reviewSession,
            requiresReview: true
        };
    }

    // No missed tasks - proceed with normal optimization
    const currentMinutes = getCurrentMinutes();
    const changes = [];
    const occupiedSlots = new Set();

    // ============================================================
    // PHASE 1: Classify all items by type
    // ============================================================
    const routines = [];
    const events = [];
    const tasks = [];

    for (const item of allItems) {
        const metadata = parseTaskMetadata(item);
        item._metadata = metadata; // Cache metadata for later use

        if (metadata.type === 'routine') {
            routines.push(item);
            log(`  🔄 Routine: "${item.title}"`);
        } else if (metadata.type === 'event') {
            events.push(item);
            log(`  📅 Event: "${item.title}"`);
        } else {
            tasks.push(item);
            log(`  📝 Task: "${item.title}"`);
        }
    }

    log(`\n📊 Classification: ${routines.length} routines, ${events.length} events, ${tasks.length} tasks`);

    // ============================================================
    // PHASE 2: Block slots for FIXED items (routines & events)
    // These items cannot be moved - they define the schedule structure
    // ============================================================

    // Block routine slots (routines are fixed in their time)
    for (const routine of routines) {
        if (routine.startDate) {
            const startDate = new Date(routine.startDate);
            const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
            const duration = routine._metadata.duration || 30;
            const slotsNeeded = Math.ceil(duration / 10);

            for (let i = 0; i < slotsNeeded; i++) {
                occupiedSlots.add(startMinutes + i * 10);
            }
            log(`  🔒 Blocked ${startMinutes}-${startMinutes + duration} for routine: ${routine.title}`);
        }
    }

    // Block event slots (events are fixed appointments/meetings)
    for (const event of events) {
        if (event.startDate) {
            const startDate = new Date(event.startDate);
            const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
            const duration = event._metadata.duration || 60; // Events default to 1 hour
            const slotsNeeded = Math.ceil(duration / 10);

            for (let i = 0; i < slotsNeeded; i++) {
                occupiedSlots.add(startMinutes + i * 10);
            }
            log(`  🔒 Blocked ${startMinutes}-${startMinutes + duration} for event: ${event.title}`);
        }
    }

    // ============================================================
    // PHASE 3: Handle FLEXIBLE items (tasks)
    // Only tasks can be rescheduled
    // ============================================================

    // Sort tasks by priority score
    tasks.sort((a, b) => calculatePriorityScore(b) - calculatePriorityScore(a));

    // Separate tasks that need rescheduling vs already scheduled
    const tasksToReschedule = [];

    for (const task of tasks) {
        const metadata = task._metadata;

        if (task.startDate) {
            const startDate = new Date(task.startDate);
            const taskStartMinutes = startDate.getHours() * 60 + startDate.getMinutes();
            const taskEndMinutes = taskStartMinutes + (metadata.duration || 30);

            // Task's scheduled time has fully passed - needs rescheduling
            if (taskEndMinutes < currentMinutes) {
                tasksToReschedule.push(task);
                continue;
            }

            // Task is scheduled for later - mark slots as occupied
            if (taskStartMinutes >= currentMinutes) {
                const slotsNeeded = Math.ceil((metadata.duration || 30) / 10);
                for (let i = 0; i < slotsNeeded; i++) {
                    occupiedSlots.add(taskStartMinutes + i * 10);
                }
                continue;
            }
        }

        // No start time - needs scheduling
        tasksToReschedule.push(task);
    }

    log(`\n📋 Found ${tasksToReschedule.length} tasks to reschedule (skipping ${routines.length} routines and ${events.length} events)`);

    // ============================================================
    // PHASE 4: Reschedule flexible tasks around fixed items
    // ============================================================

    for (const task of tasksToReschedule) {
        const metadata = task._metadata;
        const nextSlot = findNextSlot(task, currentMinutes, occupiedSlots);

        if (nextSlot) {
            // Determine the correct date for rescheduling
            let newStartTime;
            let dayLabel;

            if (nextSlot.isToday) {
                newStartTime = minutesToISOToday(nextSlot.slot);
                dayLabel = 'today';
            } else if (nextSlot.useNextWorkday) {
                // Work tasks skip weekends
                newStartTime = minutesToISONextWorkday(nextSlot.slot);
                const nextWorkday = getNextWorkday();
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                dayLabel = dayNames[nextWorkday.getDay()];
            } else {
                // Personal tasks go to tomorrow (can be weekend)
                newStartTime = minutesToISOTomorrow(nextSlot.slot);
                dayLabel = 'tomorrow';
            }

            // Update task in TickTick
            try {
                await tickTickCall('ticktick_update_task', {
                    task_id: task.id,
                    project_id: task.projectId,
                    start_date: newStartTime
                });

                const timeStr = `${Math.floor(nextSlot.slot / 60) % 12 || 12}:${(nextSlot.slot % 60).toString().padStart(2, '0')} ${nextSlot.slot >= 720 ? 'PM' : 'AM'}`;

                changes.push({
                    task: task.title,
                    type: 'task',
                    action: nextSlot.isToday ? 'rescheduled' : 'moved_to_future',
                    newTime: timeStr,
                    dayLabel: dayLabel,
                    isToday: nextSlot.isToday
                });

                log(`  ✅ Rescheduled "${task.title}" to ${dayLabel} at ${timeStr}`);
            } catch (e) {
                log(`  ❌ Failed to reschedule "${task.title}": ${e.message}`);
            }
        }
    }

    // Get fresh task list after rescheduling
    const updatedTasks = await tickTickCall('ticktick_get_engaged_tasks');

    // Build summary message
    let message = '';
    if (changes.length === 0) {
        message = '✅ Schedule is already optimized!';
    } else {
        const rescheduledToday = changes.filter(c => c.isToday);
        const movedToFuture = changes.filter(c => !c.isToday);

        message = `🧠 **Schedule Optimized!**\n\n`;

        if (rescheduledToday.length > 0) {
            message += `**Rescheduled for today (${rescheduledToday.length}):**\n`;
            rescheduledToday.forEach(c => {
                message += `• ${c.task} → ${c.newTime}\n`;
            });
            message += '\n';
        }

        if (movedToFuture.length > 0) {
            // Group by day label
            const byDay = {};
            movedToFuture.forEach(c => {
                const day = c.dayLabel || 'tomorrow';
                if (!byDay[day]) byDay[day] = [];
                byDay[day].push(c);
            });

            for (const [day, dayChanges] of Object.entries(byDay)) {
                message += `**Moved to ${day} (${dayChanges.length}):**\n`;
                dayChanges.forEach(c => {
                    message += `• ${c.task} → ${c.newTime}\n`;
                });
                message += '\n';
            }
        }
    }

    return {
        message,
        tasks: updatedTasks || [],
        changes,
        status: 'success'
    };
}

// Main command processor
async function processCommand(cmd) {
    const command = (cmd.command || '').toLowerCase();

    // ============================================================
    // FIRST: Check for active review session
    // If user is mid-review, route their response to review flow
    // ============================================================
    const existingReviewSession = loadReviewSession();
    if (existingReviewSession && existingReviewSession.state) {
        // User is responding to a review question
        // Unless they're explicitly calling a different command
        const isExplicitCommand = command.startsWith('/');
        if (!isExplicitCommand) {
            log('📋 Processing review response...');
            const reviewResult = await processReviewFlow(cmd);

            // Check if review is complete and we should optimize
            if (reviewResult && reviewResult.proceedToOptimize) {
                // Clear the session flag and run actual optimization
                const optimizeResult = await runActualOptimization();
                return {
                    message: reviewResult.message + '\n\n' + optimizeResult.message,
                    waitingFor: false,
                    status: 'success',
                    tasks: optimizeResult.tasks,
                    changes: optimizeResult.changes
                };
            }

            return reviewResult;
        }
    }

    if (command.includes('/optimize-schedule') || command.includes('/optimize')) {
        return await processOptimizeSchedule(cmd);
    } else if (command.includes('/now') || cmd.isNowQuery) {
        return await processNow(cmd);
    } else if (command.includes('/add') || cmd.isAddQuery) {
        return await processAdd(cmd);
    } else if (command.includes('/morning')) {
        return await processMorning(cmd);
    } else if (command.includes('/evening')) {
        return await processEvening(cmd);
    } else if (command.includes('/checkin')) {
        return await processCheckin(cmd);
    } else if (command.includes('/skip-review')) {
        // Allow user to skip review and go straight to optimization
        clearReviewSession();
        return await runActualOptimization();
    } else {
        // Default response for unknown commands
        return {
            message: `I received your message: "${cmd.fullCommand || cmd.command}"

**Available commands:**
• **/now** - What should I be doing?
• **/add** - Add a new task
• **/optimize** - Optimize and reschedule tasks
• **/morning** - Morning planning
• **/evening** - Evening review
• **/checkin** - Check in on progress`,
            waitingFor: false,
            status: 'success'
        };
    }
}

// Run the actual optimization (called after review or directly)
async function runActualOptimization() {
    log('🧠 Running actual optimization...');

    const currentMinutes = getCurrentMinutes();
    const changes = [];
    const occupiedSlots = new Set();

    // Get all engaged tasks
    const allItems = await tickTickCall('ticktick_get_engaged_tasks');

    if (!allItems || allItems.length === 0) {
        return {
            message: '✅ Schedule is clear!',
            tasks: [],
            changes: [],
            status: 'success'
        };
    }

    // Classify items
    const routines = [];
    const events = [];
    const tasks = [];

    for (const item of allItems) {
        const metadata = parseTaskMetadata(item);
        item._metadata = metadata;

        if (metadata.type === 'routine') {
            routines.push(item);
        } else if (metadata.type === 'event') {
            events.push(item);
        } else {
            tasks.push(item);
        }
    }

    // Block routine and event slots
    for (const routine of routines) {
        if (routine.startDate) {
            const startDate = new Date(routine.startDate);
            const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
            const duration = routine._metadata.duration || 30;
            const slotsNeeded = Math.ceil(duration / 10);

            for (let i = 0; i < slotsNeeded; i++) {
                occupiedSlots.add(startMinutes + i * 10);
            }
        }
    }

    for (const event of events) {
        if (event.startDate) {
            const startDate = new Date(event.startDate);
            const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
            const duration = event._metadata.duration || 60;
            const slotsNeeded = Math.ceil(duration / 10);

            for (let i = 0; i < slotsNeeded; i++) {
                occupiedSlots.add(startMinutes + i * 10);
            }
        }
    }

    // Sort tasks by priority
    tasks.sort((a, b) => calculatePriorityScore(b) - calculatePriorityScore(a));

    // Find tasks to reschedule
    const tasksToReschedule = [];

    for (const task of tasks) {
        const metadata = task._metadata;

        if (task.startDate) {
            const startDate = new Date(task.startDate);
            const taskStartMinutes = startDate.getHours() * 60 + startDate.getMinutes();
            const taskEndMinutes = taskStartMinutes + (metadata.duration || 30);

            if (taskEndMinutes < currentMinutes) {
                tasksToReschedule.push(task);
                continue;
            }

            if (taskStartMinutes >= currentMinutes) {
                const slotsNeeded = Math.ceil((metadata.duration || 30) / 10);
                for (let i = 0; i < slotsNeeded; i++) {
                    occupiedSlots.add(taskStartMinutes + i * 10);
                }
                continue;
            }
        }

        tasksToReschedule.push(task);
    }

    // Reschedule tasks
    for (const task of tasksToReschedule) {
        const metadata = task._metadata;
        const nextSlot = findNextSlot(task, currentMinutes, occupiedSlots);

        if (nextSlot) {
            let newStartTime;
            let dayLabel;

            if (nextSlot.isToday) {
                newStartTime = minutesToISOToday(nextSlot.slot);
                dayLabel = 'today';
            } else if (nextSlot.useNextWorkday) {
                newStartTime = minutesToISONextWorkday(nextSlot.slot);
                const nextWorkday = getNextWorkday();
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                dayLabel = dayNames[nextWorkday.getDay()];
            } else {
                newStartTime = minutesToISOTomorrow(nextSlot.slot);
                dayLabel = 'tomorrow';
            }

            try {
                await tickTickCall('ticktick_update_task', {
                    task_id: task.id,
                    project_id: task.projectId,
                    start_date: newStartTime
                });

                const timeStr = `${Math.floor(nextSlot.slot / 60) % 12 || 12}:${(nextSlot.slot % 60).toString().padStart(2, '0')} ${nextSlot.slot >= 720 ? 'PM' : 'AM'}`;

                changes.push({
                    task: task.title,
                    type: 'task',
                    action: nextSlot.isToday ? 'rescheduled' : 'moved_to_future',
                    newTime: timeStr,
                    dayLabel: dayLabel,
                    isToday: nextSlot.isToday
                });

                log(`  ✅ Rescheduled "${task.title}" to ${dayLabel} at ${timeStr}`);
            } catch (e) {
                log(`  ❌ Failed to reschedule "${task.title}": ${e.message}`);
            }
        }
    }

    // Get fresh task list
    const updatedTasks = await tickTickCall('ticktick_get_engaged_tasks');

    // Build message
    let message = '';
    if (changes.length === 0) {
        message = '✅ Schedule is already optimized!';
    } else {
        const rescheduledToday = changes.filter(c => c.isToday);
        const movedToFuture = changes.filter(c => !c.isToday);

        message = `🧠 **Schedule Optimized!**\n\n`;

        if (rescheduledToday.length > 0) {
            message += `**Rescheduled for today (${rescheduledToday.length}):**\n`;
            rescheduledToday.forEach(c => {
                message += `• ${c.task} → ${c.newTime}\n`;
            });
            message += '\n';
        }

        if (movedToFuture.length > 0) {
            const byDay = {};
            movedToFuture.forEach(c => {
                const day = c.dayLabel || 'tomorrow';
                if (!byDay[day]) byDay[day] = [];
                byDay[day].push(c);
            });

            for (const [day, dayChanges] of Object.entries(byDay)) {
                message += `**Moved to ${day} (${dayChanges.length}):**\n`;
                dayChanges.forEach(c => {
                    message += `• ${c.task} → ${c.newTime}\n`;
                });
                message += '\n';
            }
        }
    }

    return {
        message,
        tasks: updatedTasks || [],
        changes,
        status: 'success'
    };
}

// Check queue and process
async function checkAndProcess() {
    if (isProcessing) return;

    try {
        if (!fs.existsSync(COMMAND_QUEUE)) return;

        const queue = JSON.parse(fs.readFileSync(COMMAND_QUEUE, 'utf8'));
        if (!queue.commands || queue.commands.length === 0) return;

        const latestCmd = queue.commands[queue.commands.length - 1];

        if (latestCmd.timestamp <= lastProcessedTimestamp) return;

        isProcessing = true;
        lastProcessedTimestamp = latestCmd.timestamp;

        log(`\n📥 Processing command: ${latestCmd.command || latestCmd.id}`);

        const response = await processCommand(latestCmd);
        saveResponse(latestCmd.id, response);

        // Clear processed command from queue
        queue.commands = queue.commands.filter(c => c.id !== latestCmd.id);
        fs.writeFileSync(COMMAND_QUEUE, JSON.stringify(queue, null, 2));

        isProcessing = false;

    } catch (e) {
        log(`❌ Error: ${e.message}`);
        isProcessing = false;
    }
}

// Start watching
function start() {
    console.log(`
🤖 Executive Brain Auto-Processor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 Watching: ${COMMAND_QUEUE}
🌐 Bridge: ${BRIDGE_URL}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Commands will be processed automatically!
`);

    // Initial check
    checkAndProcess();

    // Watch for changes
    const watcher = chokidar.watch(COMMAND_QUEUE, {
        persistent: true,
        ignoreInitial: true
    });

    watcher.on('change', () => {
        log('📝 Queue changed');
        setTimeout(checkAndProcess, 300);
    });
}

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    process.exit(0);
});

// Only start if run directly (not when imported for testing)
if (require.main === module) {
    start();
}

// Export functions for testing
module.exports = {
    // Constants
    AVOIDANCE_TYPES,
    PROJECT_KEYWORDS,
    DAY_STRUCTURE,
    KANBAN_COLUMNS,
    EVENT_KEYWORDS,
    WAITING_KEYWORDS,
    WORK_PROJECT_ID,
    ROUTINES_PROJECT_ID,

    // Pure utility functions
    parseAvoidanceInput,
    detectProject,
    estimateTaskSize,
    calculatePriorityScore,
    getCurrentMinutes,
    isWeekend,
    isTodayWeekend,
    getNextWorkday,
    daysUntilNextWorkday,
    minutesToISOToday,
    minutesToISODate,
    minutesToISONextWorkday,
    minutesToISOTomorrow,
    formatTime,
    formatTask,
    formatAvoidanceOptions,
    formatStrategiesForDisplay,

    // Type detection
    detectItemType,
    determineKanbanColumn,
    parseTaskMetadata,
    detectMissedTasks,
    findNextSlot,

    // Strategy functions (require fs mocking in tests)
    getStrategiesForAvoidance,
    recordStrategyOutcome,
    addCustomStrategy,
    loadMemories,
    saveMemories,

    // Session functions (require fs mocking in tests)
    loadReviewSession,
    saveReviewSession,
    clearReviewSession,
    loadResponses,
    saveResponse,

    // For integration testing
    processCommand,
    start
};

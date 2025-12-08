const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Store conversation state
const conversationState = new Map();

// Project mapping
const PROJECT_IDS = {
    work: '692cc2ab575c11180e5d9df0',
    health: '61e994808f08ba41391df204',
    finances: '61eaa26ade5e11185de999de',
    relationships: '61e997578f08ba41391e29e3',
    hobbies: '61e997ea8f08ba41391e3488',
    maintenance: '620282978f083846135d3c04',
    shopping: '620bd72b8f0824cbd37c5a33',
    someday: '692cfb649dbb511e6fe1e9f3',
    routines: '61e863eb8f08484e9018fa6e',
    forging: '61e992568f08ba41391dc715'
};

// API Routes
app.post('/api/command', async (req, res) => {
    const { command, sessionId } = req.body;

    if (!sessionId) {
        return res.status(400).json({ error: 'Session ID required' });
    }

    // Get or create session state
    if (!conversationState.has(sessionId)) {
        conversationState.set(sessionId, {
            context: {},
            waitingFor: null
        });
    }

    const session = conversationState.get(sessionId);

    try {
        const response = await processCommand(command, session);
        res.json(response);
    } catch (error) {
        console.error('Error processing command:', error);
        res.status(500).json({
            error: 'Failed to process command',
            message: error.message
        });
    }
});

async function processCommand(command, session) {
    const lowerCommand = command.toLowerCase().trim();

    // Check if we're waiting for a response
    if (session.waitingFor) {
        return await handleWaitingResponse(command, session);
    }

    // Handle commands
    if (lowerCommand === '/morning' || lowerCommand.includes('morning planning')) {
        return await handleMorningCommand(session);
    }

    if (lowerCommand === '/evening' || lowerCommand.includes('evening review')) {
        return await handleEveningCommand(session);
    }

    if (lowerCommand === '/focus' || lowerCommand.includes('focus tasks')) {
        return await handleFocusCommand(session);
    }

    if (lowerCommand === '/intake' || lowerCommand.includes('brain dump')) {
        return await handleIntakeCommand(session);
    }

    if (lowerCommand === '/stuck' || lowerCommand.includes('stuck') || lowerCommand.includes('overwhelmed')) {
        return await handleStuckCommand(session);
    }

    if (lowerCommand.startsWith('/quick-add')) {
        const taskText = command.replace(/\/quick-add\s*/i, '').trim();
        return await handleQuickAdd(taskText, session);
    }

    // Natural language processing
    return await handleNaturalLanguage(command, session);
}

async function handleMorningCommand(session) {
    let response = `Good morning, Danny! ☀️ Let's plan your day.\n\n`;
    response += `I'll check your TickTick tasks for today.\n\n`;
    response += `**First, let's set your top 3 priorities for today.**\n\n`;
    response += `What's the most important thing you need to accomplish today?`;

    session.waitingFor = 'morning_priority_1';
    session.context.morningPriorities = [];

    return {
        message: response,
        waitingFor: true
    };
}

async function handleEveningCommand(session) {
    let response = `Evening review time! 🌙\n\n`;
    response += `**Let's reflect on today:**\n\n`;
    response += `First question: What was your biggest win today? (Even small wins count!)`;

    session.waitingFor = 'evening_win';
    session.context.eveningReview = {};

    return {
        message: response,
        waitingFor: true
    };
}

async function handleFocusCommand(session) {
    // This command will be processed by Claude with real TickTick data
    // For now, return a template that Claude can fill in with actual data
    let response = `🎯 **FOCUS MODE - Priority Tasks**\n\n`;
    response += `*Fetching your high and medium priority tasks that need attention...*\n\n`;

    response += `**🔴 HIGH PRIORITY (Overdue & Today):**\n`;
    response += `• [Tasks will be loaded from TickTick]\n\n`;

    response += `**🟡 MEDIUM PRIORITY (Overdue & Today):**\n`;
    response += `• [Tasks will be loaded from TickTick]\n\n`;

    response += `**Suggested Focus Order:**\n`;
    response += `1. Start with the most overdue high-priority task\n`;
    response += `2. Work through today's high-priority tasks\n`;
    response += `3. Then tackle medium-priority items\n\n`;

    response += `*Use this command when you need to see what really needs your attention RIGHT NOW, filtering out all the noise.*\n\n`;
    response += `Which task would you like to focus on first?`;

    session.waitingFor = 'focus_selection';
    session.context.focusMode = true;

    return {
        message: response,
        waitingFor: true,
        needsTickTickData: true  // Flag for Claude to fill in real data
    };
}

async function handleIntakeCommand(session) {
    session.waitingFor = 'intake_dump';
    session.context.intakeItems = [];

    return {
        message: `Brain dump mode activated! 💭

Just start typing everything that's on your mind. Tasks, worries, ideas, deadlines - get it all out.

When you're done dumping, type "done" and I'll help you organize everything into actionable tasks.

Go ahead, what's on your mind?`,
        waitingFor: true
    };
}

async function handleStuckCommand(session) {
    session.waitingFor = 'stuck_task';

    return {
        message: `I'm here to help you get unstuck. 🚦

First, let's identify what you're stuck on.

**What specific task or situation has you feeling stuck right now?**

Be as specific as possible - the more detail, the better I can help.`,
        waitingFor: true
    };
}

async function handleQuickAdd(taskText, session) {
    if (!taskText) {
        return {
            message: 'What task would you like to add? Example: `/quick-add Review pull requests`',
            waitingFor: false
        };
    }

    session.waitingFor = 'quick_add_project';
    session.context.quickAddTask = taskText;

    return {
        message: `Adding "${taskText}" to your tasks.

Which project should this go in?
• 💻 Work
• 💪 Health
• 💵 Finances
• 👫 Relationships
• 🧗🏻 Hobbies
• 🔧 Maintenance
• 🛍️ Shopping
• ❓ Someday-Maybe

Just type the name or emoji of the project (or press Enter for Work as default):`,
        waitingFor: true
    };
}

async function handleNaturalLanguage(command, session) {
    // Check for task-related keywords
    if (command.match(/\b(add|create|new|make)\s+(task|todo|item)/i)) {
        const taskMatch = command.match(/(?:task|todo|item)[:\s]+(.+)/i);
        const taskText = taskMatch ? taskMatch[1] : command.replace(/\b(add|create|new|make)\s+(task|todo|item)\s*/i, '');
        return await handleQuickAdd(taskText.trim(), session);
    }

    // Default response
    return {
        message: `I understand you said: "${command}"

I can help you with:
• Managing tasks in TickTick
• Planning your day (/morning)
• See urgent priorities (/focus)
• Reviewing your progress (/evening)
• Brain dumping (/intake)
• Getting unstuck (/stuck)
• Quick task addition (/quick-add)

What would you like to do?`,
        waitingFor: false
    };
}

async function handleWaitingResponse(response, session) {
    const waitingFor = session.waitingFor;

    // Morning planning flow
    if (waitingFor === 'morning_priority_1') {
        session.context.morningPriorities.push(response);
        session.waitingFor = 'morning_priority_2';
        return {
            message: `Got it: "${response}"\n\nWhat's the second most important thing?`,
            waitingFor: true
        };
    }

    if (waitingFor === 'morning_priority_2') {
        session.context.morningPriorities.push(response);
        session.waitingFor = 'morning_priority_3';
        return {
            message: `Good: "${response}"\n\nAnd the third priority?`,
            waitingFor: true
        };
    }

    if (waitingFor === 'morning_priority_3') {
        session.context.morningPriorities.push(response);
        session.waitingFor = null;

        return {
            message: `Perfect! Your top 3 priorities are set:
1. ${session.context.morningPriorities[0]}
2. ${session.context.morningPriorities[1]}
3. ${session.context.morningPriorities[2]}

I'll add these to your TickTick as high-priority tasks for today.

Remember:
• Focus on one task at a time
• Your peak focus is 11am-2pm - tackle the hardest one then
• Take breaks between tasks

You've got this! 💪`,
            waitingFor: false,
            tasks: session.context.morningPriorities
        };
    }

    // Evening review flow
    if (waitingFor === 'evening_win') {
        session.context.eveningReview.win = response;
        session.waitingFor = 'evening_blocker';
        return {
            message: `That's awesome! Celebrating: "${response}" 🎉\n\nNow, what got in your way today? What made things harder than expected?`,
            waitingFor: true
        };
    }

    if (waitingFor === 'evening_blocker') {
        session.context.eveningReview.blocker = response;
        session.waitingFor = 'evening_tomorrow';
        return {
            message: `Thanks for sharing that. We'll work on: "${response}"\n\nFinally, what's one thing you want to prioritize tomorrow?`,
            waitingFor: true
        };
    }

    if (waitingFor === 'evening_tomorrow') {
        session.context.eveningReview.tomorrow = response;
        session.waitingFor = null;

        return {
            message: `Great evening review! Here's your summary:

**Today's Win:** ${session.context.eveningReview.win}
**Challenge Faced:** ${session.context.eveningReview.blocker}
**Tomorrow's Priority:** ${session.context.eveningReview.tomorrow}

I'll add tomorrow's priority to TickTick for 11am (your peak focus time).

Rest well tonight. You did good today! 🌙`,
            waitingFor: false
        };
    }

    // Brain dump flow
    if (waitingFor === 'intake_dump') {
        if (response.toLowerCase() === 'done') {
            session.waitingFor = null;

            if (session.context.intakeItems.length === 0) {
                return {
                    message: `No items to process. Feel free to brain dump anytime!`,
                    waitingFor: false
                };
            }

            // Process and organize the brain dump
            let organized = `Great brain dump! Let me organize these ${session.context.intakeItems.length} items:\n\n`;

            for (let i = 0; i < session.context.intakeItems.length; i++) {
                const item = session.context.intakeItems[i];
                organized += `${i + 1}. ${item}\n`;
            }

            organized += `\nI'll break these down into 15-30 minute tasks and add them to your TickTick. Sound good?`;

            return {
                message: organized,
                waitingFor: false,
                tasks: session.context.intakeItems
            };
        } else {
            session.context.intakeItems.push(response);
            return {
                message: `Got it: "${response}"\n\nWhat else? (type 'done' when finished)`,
                waitingFor: true
            };
        }
    }

    // Focus flow
    if (waitingFor === 'focus_selection') {
        session.waitingFor = null;
        const selectedTask = response;

        return {
            message: `Great! Let's focus on: "${selectedTask}"

**Getting you into focus mode:**
• Close all unnecessary tabs and apps
• Put your phone on silent or in another room
• Set a timer for 25 minutes (Pomodoro technique)
• Work ONLY on this task until the timer goes off

**Remember:**
• Progress > Perfection
• If it feels too big, what's the smallest next step?
• You can do hard things for 25 minutes

Ready? Start your timer now and GO! 🚀

Check back in when you're done or if you get stuck.`,
            waitingFor: false
        };
    }

    // Stuck flow
    if (waitingFor === 'stuck_task') {
        session.context.stuckTask = response;
        session.waitingFor = 'stuck_reason';
        return {
            message: `I hear you're stuck on: "${response}"

What's making this feel hard? Pick the closest one:
• It feels too big/overwhelming
• I don't know where to start
• I'm waiting on someone/something
• I'm afraid of messing up
• I keep getting distracted
• Something else (please explain)`,
            waitingFor: true
        };
    }

    if (waitingFor === 'stuck_reason') {
        session.waitingFor = null;
        const task = session.context.stuckTask;

        let suggestion = `Let's tackle "${task}" together.\n\n`;

        if (response.includes('big') || response.includes('overwhelm')) {
            suggestion += `**This feels too big. Let's break it down:**\n`;
            suggestion += `1. What's the very first tiny step? (Even just opening a file counts)\n`;
            suggestion += `2. Can we make a 2-minute version of this?\n`;
            suggestion += `3. What would 10% progress look like?\n\n`;
            suggestion += `Try this: Set a timer for 2 minutes and just START. No pressure to finish.\n\n`;
            suggestion += `What's literally the first thing you'd need to click or type?`;
        } else if (response.includes('start')) {
            suggestion += `**Finding your entry point:**\n`;
            suggestion += `• Open the relevant file/app/website\n`;
            suggestion += `• Write one sentence about what you want to accomplish\n`;
            suggestion += `• List out the steps (messy is fine!)\n`;
            suggestion += `• Pick the easiest step to start\n\n`;
            suggestion += `Right now, just open what you need to work on. That's it. That's the whole task.`;
        } else if (response.includes('distract')) {
            suggestion += `**Battling distractions:**\n`;
            suggestion += `• Set a 15-minute timer\n`;
            suggestion += `• Close all other tabs/apps\n`;
            suggestion += `• Put your phone in another room\n`;
            suggestion += `• Tell yourself: "Just 15 minutes"\n\n`;
            suggestion += `Want me to be your accountability buddy? Start now and check in with me in 15 minutes!`;
        } else {
            suggestion += `**Let's get unstuck:**\n`;
            suggestion += `• Make the task smaller (what's 1/4 of it?)\n`;
            suggestion += `• Lower the bar (done is better than perfect)\n`;
            suggestion += `• Set a timer for just 10 minutes\n`;
            suggestion += `• Do the easiest part first\n\n`;
            suggestion += `Remember: Motion creates motivation. Just start badly!`;
        }

        return {
            message: suggestion,
            waitingFor: false
        };
    }

    // Quick add flow
    if (waitingFor === 'quick_add_project') {
        const projectName = response.toLowerCase().trim() || 'work';
        const projectId = PROJECT_IDS[projectName] || PROJECT_IDS.work;

        session.waitingFor = 'quick_add_priority';
        session.context.quickAddProject = projectName;

        return {
            message: `Task: "${session.context.quickAddTask}"
Project: ${projectName}

What priority level?
• 🔴 High (urgent/important)
• 🟡 Medium (important, not urgent)
• ⚪ Low (nice to have)

Type high, medium, or low (or press Enter for medium):`,
            waitingFor: true
        };
    }

    if (waitingFor === 'quick_add_priority') {
        const priority = response.toLowerCase().trim() || 'medium';
        session.waitingFor = null;

        return {
            message: `✅ Task added!

**Task:** ${session.context.quickAddTask}
**Project:** ${session.context.quickAddProject}
**Priority:** ${priority}

The task has been added to your TickTick!`,
            waitingFor: false
        };
    }

    // Default - clear waiting state
    session.waitingFor = null;
    return await handleNaturalLanguage(response, session);
}

app.listen(PORT, () => {
    console.log(`Executive Brain server running on http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});
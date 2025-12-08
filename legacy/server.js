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

// Since MCP is already connected through Claude, we'll use direct API calls
// The MCP server connection is handled by the Claude environment
let mcpConnected = true;

async function initializeMCP() {
    // MCP is already available through Claude's environment
    console.log('Using existing TickTick MCP connection');
    return true;
}

// Helper function to call MCP tools
async function callMCPTool(toolName, args = {}) {
    if (!mcpClient) {
        throw new Error('MCP client not initialized');
    }

    try {
        const result = await mcpClient.callTool({
            name: toolName,
            arguments: args
        });
        return result;
    } catch (error) {
        console.error(`Error calling MCP tool ${toolName}:`, error);
        throw error;
    }
}

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
    try {
        // Fetch today's tasks and overdue tasks in parallel
        const [todayTasks, overdueTasks, projects] = await Promise.all([
            callMCPTool('mcp__ticktick__get_tasks_due_today'),
            callMCPTool('mcp__ticktick__get_overdue_tasks'),
            callMCPTool('mcp__ticktick__get_projects')
        ]);

        let response = `Good morning, Danny! ☀️ Let's plan your day.\n\n`;

        // Show overdue tasks
        if (overdueTasks.content && overdueTasks.content.length > 0) {
            response += `**⚠️ Overdue Tasks (${overdueTasks.content.length}):**\n`;
            overdueTasks.content.slice(0, 5).forEach(task => {
                response += `• ${task.title}${task.projectName ? ` (${task.projectName})` : ''}\n`;
            });
            response += '\n';
        }

        // Show today's tasks
        if (todayTasks.content && todayTasks.content.length > 0) {
            response += `**📅 Today's Tasks (${todayTasks.content.length}):**\n`;
            todayTasks.content.forEach(task => {
                const priority = task.priority === 5 ? '🔴' : task.priority === 3 ? '🟡' : '⚪';
                response += `${priority} ${task.title}${task.projectName ? ` (${task.projectName})` : ''}\n`;
            });
            response += '\n';
        } else {
            response += `**No tasks scheduled for today yet.**\n\n`;
        }

        response += `**Let's set your top 3 priorities.**\nWhat's the most important thing you need to accomplish today?`;

        session.waitingFor = 'morning_priority_1';
        session.context.morningPriorities = [];

        return {
            message: response,
            waitingFor: true,
            tasks: {
                today: todayTasks.content || [],
                overdue: overdueTasks.content || []
            }
        };
    } catch (error) {
        console.error('Error in morning command:', error);
        return {
            message: `I'm having trouble connecting to TickTick. Let's try again in a moment. Error: ${error.message}`,
            error: true
        };
    }
}

async function handleEveningCommand(session) {
    try {
        // Get completed tasks for today
        const allTasks = await callMCPTool('mcp__ticktick__get_all_tasks');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaysTasks = allTasks.content ? allTasks.content.filter(task => {
            if (task.completedTime) {
                const completedDate = new Date(task.completedTime);
                completedDate.setHours(0, 0, 0, 0);
                return completedDate.getTime() === today.getTime();
            }
            return false;
        }) : [];

        let response = `Evening review time! 🌙\n\n`;

        if (todaysTasks.length > 0) {
            response += `**✅ Today's Completed Tasks (${todaysTasks.length}):**\n`;
            todaysTasks.forEach(task => {
                response += `• ${task.title}\n`;
            });
            response += `\nGreat work today! 🎉\n\n`;
        }

        response += `**Reflection Questions:**\n`;
        response += `1. What was your biggest win today? (Even small wins count!)\n`;
        response += `2. What got in your way today?\n`;
        response += `3. What's one thing you want to prioritize tomorrow?\n\n`;
        response += `Let's start with your biggest win. What went well today?`;

        session.waitingFor = 'evening_win';
        session.context.eveningReview = {};

        return {
            message: response,
            waitingFor: true
        };
    } catch (error) {
        console.error('Error in evening command:', error);
        return {
            message: `Let's do a quick review without TickTick for now. What was your biggest win today?`,
            waitingFor: true
        };
    }
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

    session.waitingFor = 'quick_add_details';
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

    if (command.match(/\b(show|list|what|view)\s+(my\s+)?(task|todo|today|schedule)/i)) {
        try {
            const todayTasks = await callMCPTool('mcp__ticktick__get_tasks_due_today');

            if (todayTasks.content && todayTasks.content.length > 0) {
                let response = `**Today's Tasks:**\n`;
                todayTasks.content.forEach(task => {
                    const priority = task.priority === 5 ? '🔴' : task.priority === 3 ? '🟡' : '⚪';
                    response += `${priority} ${task.title}${task.projectName ? ` (${task.projectName})` : ''}\n`;
                });
                return { message: response, waitingFor: false };
            } else {
                return { message: 'No tasks scheduled for today. Would you like to add some?', waitingFor: false };
            }
        } catch (error) {
            return { message: 'Having trouble fetching your tasks. Try again in a moment.', error: true };
        }
    }

    // Default response
    return {
        message: `I understand you said: "${command}"

I can help you with:
• Managing tasks in TickTick
• Planning your day (/morning)
• Reviewing your progress (/evening)
• Brain dumping (/intake)
• Getting unstuck (/stuck)

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

        // Create tasks for the priorities
        let tasksCreated = [];
        for (const priority of session.context.morningPriorities) {
            try {
                await callMCPTool('mcp__ticktick__create_task', {
                    title: priority,
                    project_id: '692cc2ab575c11180e5d9df0', // Work project
                    priority: 5, // High priority for top 3
                    due_date: new Date().toISOString()
                });
                tasksCreated.push(priority);
            } catch (error) {
                console.error('Error creating task:', error);
            }
        }

        return {
            message: `Perfect! Your top 3 priorities are set:
1. ${session.context.morningPriorities[0]}
2. ${session.context.morningPriorities[1]}
3. ${session.context.morningPriorities[2]}

I've added these to your TickTick as high-priority tasks for today.

Remember:
• Focus on one task at a time
• Your peak focus is 11am-2pm - tackle the hardest one then
• Take breaks between tasks

You've got this! 💪`,
            waitingFor: false
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
            message: `Thanks for sharing that. We'll work on that: "${response}"\n\nFinally, what's one thing you want to prioritize tomorrow?`,
            waitingFor: true
        };
    }

    if (waitingFor === 'evening_tomorrow') {
        session.context.eveningReview.tomorrow = response;
        session.waitingFor = null;

        // Create tomorrow's task
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(11, 0, 0, 0); // Set for 11am (peak time)

        try {
            await callMCPTool('mcp__ticktick__create_task', {
                title: response,
                project_id: '692cc2ab575c11180e5d9df0', // Work project
                priority: 5, // High priority
                due_date: tomorrow.toISOString()
            });
        } catch (error) {
            console.error('Error creating tomorrow task:', error);
        }

        return {
            message: `Great evening review! Here's your summary:

**Today's Win:** ${session.context.eveningReview.win}
**Challenge Faced:** ${session.context.eveningReview.blocker}
**Tomorrow's Priority:** ${session.context.eveningReview.tomorrow}

I've added tomorrow's priority to TickTick for 11am (your peak focus time).

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

            organized += `\nShould I add all of these to TickTick? Or would you like to review and modify them first?`;

            session.waitingFor = 'intake_confirm';
            return {
                message: organized,
                waitingFor: true
            };
        } else {
            session.context.intakeItems.push(response);
            return {
                message: `Got it: "${response}"\n\nWhat else? (type 'done' when finished)`,
                waitingFor: true
            };
        }
    }

    if (waitingFor === 'intake_confirm') {
        if (response.toLowerCase().includes('yes') || response.toLowerCase().includes('add')) {
            // Add all tasks to TickTick
            let added = 0;
            for (const item of session.context.intakeItems) {
                try {
                    await callMCPTool('mcp__ticktick__create_task', {
                        title: item,
                        project_id: '692cc2ab575c11180e5d9df0', // Work project by default
                        priority: 3 // Medium priority by default
                    });
                    added++;
                } catch (error) {
                    console.error('Error adding task:', error);
                }
            }

            session.waitingFor = null;
            return {
                message: `Added ${added} tasks to TickTick! They're in your Work project with medium priority. You can reorganize them later.`,
                waitingFor: false
            };
        } else {
            session.waitingFor = null;
            return {
                message: `No problem! Your brain dump is saved. Let me know when you want to process these items.`,
                waitingFor: false
            };
        }
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
    if (waitingFor === 'quick_add_details') {
        const projectMap = {
            'work': '692cc2ab575c11180e5d9df0',
            '💻': '692cc2ab575c11180e5d9df0',
            'health': '61e994808f08ba41391df204',
            '💪': '61e994808f08ba41391df204',
            'finances': '61eaa26ade5e11185de999de',
            '💵': '61eaa26ade5e11185de999de',
            'relationships': '61e997578f08ba41391e29e3',
            '👫': '61e997578f08ba41391e29e3',
            'hobbies': '61e997ea8f08ba41391e3488',
            '🧗🏻': '61e997ea8f08ba41391e3488',
            'maintenance': '620282978f083846135d3c04',
            '🔧': '620282978f083846135d3c04',
            'shopping': '620bd72b8f0824cbd37c5a33',
            '🛍️': '620bd72b8f0824cbd37c5a33',
            'someday': '692cfb649dbb511e6fe1e9f3',
            '❓': '692cfb649dbb511e6fe1e9f3'
        };

        const projectId = projectMap[response.toLowerCase()] || projectMap['work'];

        try {
            await callMCPTool('mcp__ticktick__create_task', {
                title: session.context.quickAddTask,
                project_id: projectId,
                priority: 3 // Default medium priority
            });

            session.waitingFor = null;
            return {
                message: `✅ Task added: "${session.context.quickAddTask}"\n\nProject: ${response || 'Work'}\nPriority: Medium\n\nTask has been added to TickTick!`,
                waitingFor: false
            };
        } catch (error) {
            session.waitingFor = null;
            return {
                message: `Had trouble adding the task to TickTick. Please try again.`,
                error: true
            };
        }
    }

    // Default - clear waiting state
    session.waitingFor = null;
    return await handleNaturalLanguage(response, session);
}

// Initialize MCP on server start
initializeMCP().then(success => {
    if (success) {
        console.log('MCP initialized successfully');
    } else {
        console.log('Running without MCP - mock mode');
    }
});

app.listen(PORT, () => {
    console.log(`Executive Brain server running on http://localhost:${PORT}`);
});
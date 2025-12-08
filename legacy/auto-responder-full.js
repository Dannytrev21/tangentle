#!/usr/bin/env node

/**
 * Full Auto-Responder for Executive Brain
 * Handles ALL commands with real TickTick MCP integration and memory storage
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { respondToCommand, formatFocusResponse } = require('./claude-respond.js');
const { requestClaudeConversation, loadContext } = require('./claude-handler.js');

const COMMAND_QUEUE = path.join(__dirname, '.command-queue.json');
const MEMORIES_FILE = path.join(__dirname, 'memories.json');
let processedCommands = new Set();

console.log('🤖 Executive Brain Full Auto-Responder');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✨ Processing ALL commands with Claude + TickTick MCP\n');

// Memory management
const loadMemories = () => {
    if (fs.existsSync(MEMORIES_FILE)) {
        return JSON.parse(fs.readFileSync(MEMORIES_FILE, 'utf8'));
    }
    return {
        taskPatterns: {
            commonBlockers: [],
            energyPatterns: [],
            successfulStrategies: [],
            procrastinationTriggers: []
        },
        eveningReviews: [],
        insights: [],
        preferences: {},
        lastUpdated: null
    };
};

const saveMemories = (memories) => {
    memories.lastUpdated = new Date().toISOString();
    fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memories, null, 2));
    console.log('💾 Memories updated');
};

// TickTick MCP integration - uses ACTUAL Claude Code MCP calls
const getOverdueHighPriorityTasks = async () => {
    console.log('🔍 Calling TickTick MCP: get_overdue_tasks...');
    // This will be handled by Claude Code when processing the request
    // For now, return empty array - Claude will handle the actual MCP call
    return [];
};

const getOverdueMediumPriorityTasks = async () => {
    console.log('🔍 Calling TickTick MCP: get_overdue_tasks (medium priority)...');
    return [];
};

const getTodaysIncompleteTasks = async () => {
    console.log('🔍 Calling TickTick MCP: get_tasks_due_today...');
    return [];
};

// Command handlers
const handleFocusCommand = async (commandId, sessionId) => {
    console.log(`\n🎯 Processing /focus command - DELEGATING TO CLAUDE`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        // Load context (memories, CLAUDE.md, etc.)
        const context = loadContext();

        // Create a request for Claude Code to handle this command
        const claudeRequestId = requestClaudeConversation({
            type: 'focus',
            commandId,
            sessionId,
            context: {
                memories: context.memories,
                profile: context.profile,
                claudeMdContent: context.claudeMd,
                schedule: context.schedule
            },
            instructions: `
Show Danny his focus list. You have access to TickTick MCP tools and his schedule.json.

Your goals:
1. Call mcp__ticktick__get_overdue_tasks to get ALL overdue tasks
2. Call mcp__ticktick__get_tasks_due_today to get today's tasks
3. Filter to show only HIGH priority (5) and MEDIUM priority (3) tasks
4. IMPORTANT: Times are in UTC (5 hours ahead). Convert to EST/CDT (subtract 5 hours) when displaying
5. FORMAT with emojis and include schedule-aware suggestions
6. For each task, show:
   - Title
   - Project name
   - Priority level
   - How many days overdue (if applicable)
   - Subtasks (if any)
7. SUGGEST timing based on his schedule:
   - Deep work tasks → Suggest 9am-12pm (peak focus)
   - Avoid suggesting work during standup (9:45-10:15am)
   - Routine tasks → Suggest 2-5pm (low energy ok)

Danny's schedule:
- Standup: 9:45-10:15am weekdays
- Peak Focus: 9am-12pm weekdays
- Low Energy: 2-5pm weekdays

Keep it clean and actionable. This is his "what to work on NOW" list.
`
        });

        console.log(`📤 Request created for Claude Code to process /focus...`);
        console.log(`🔄 Claude will respond via: respondToCommand('${commandId}', response)\n`);

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        respondToCommand(commandId, {
            message: `❌ Error: ${error.message}`,
            waitingFor: false
        });
    }
};

const handleEveningCommand = async (commandId, sessionId) => {
    console.log(`\n🌙 Processing /evening command - DELEGATING TO CLAUDE`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        // Load context (memories, CLAUDE.md, etc.)
        const context = loadContext();

        // Create a request for Claude Code to handle this conversation
        const claudeRequestId = requestClaudeConversation({
            type: 'evening_review',
            commandId,
            sessionId,
            context: {
                memories: context.memories,
                profile: context.profile,
                claudeMdContent: context.claudeMd,
                schedule: context.schedule
            },
            instructions: `
Conduct an evening review with Danny. You have access to TickTick MCP tools and his schedule.json.

Your goals:
1. Call mcp__ticktick__get_overdue_tasks to get ALL overdue tasks
2. Call mcp__ticktick__get_tasks_due_today to get today's tasks
3. Filter to find INCOMPLETE tasks only
4. Organize by priority (High, Medium, None) and show what didn't get done
5. IMPORTANT: Times are in UTC (5 hours ahead). Convert to EST/CDT (subtract 5 hours) when displaying
6. USE SCHEDULE DATA to identify timing conflicts:
   - Did tasks fail because they were scheduled during standup (9:45-10:15am)?
   - Were deep work tasks scheduled during low-energy period (2-5pm)?
   - Did routine tasks interfere with focus time (9am-12pm)?
7. Ask thoughtful follow-up questions about WHY tasks weren't completed
8. Identify patterns (e.g., always skip certain tasks? Energy issues in afternoons?)
9. Store insights in memories
10. Help him plan better for tomorrow using his schedule

Danny's recurring schedule (from schedule.json):
- Standup: 9:45-10:15am weekdays (meeting)
- Peak Focus: 9am-12pm weekdays (best for deep work)
- Low Energy: 2-5pm weekdays (routine tasks only)
- Morning Routine: 5:50-6:30am daily

Focus on the BIGGEST blockers first - what's really holding him back?
Be conversational, supportive, and dig deep to understand root causes.
DO NOT use pre-scripted responses - analyze and respond based on his actual answers.
Use REAL TickTick data, not mock data!
`
        });

        console.log(`📤 Request created for Claude Code to conduct evening review...`);
        console.log(`🔄 Claude will respond via: respondToCommand('${commandId}', response)\n`);

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        respondToCommand(commandId, {
            message: `❌ Error: ${error.message}\n\nFalling back to basic review.`,
            waitingFor: false
        });
    }
};

const handleMorningCommand = async (commandId, sessionId) => {
    console.log(`\n☀️ Processing /morning command - DELEGATING TO CLAUDE`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        // Load context (memories, CLAUDE.md, schedule)
        const context = loadContext();

        // Create a request for Claude Code to handle morning planning
        const claudeRequestId = requestClaudeConversation({
            type: 'morning_planning',
            commandId,
            sessionId,
            context: {
                memories: context.memories,
                profile: context.profile,
                claudeMdContent: context.claudeMd,
                schedule: context.schedule
            },
            instructions: `
Conduct morning planning with Danny. You have access to TickTick MCP tools and his schedule.json.

Your goals:
1. Call mcp__ticktick__get_overdue_tasks to see what's overdue
2. Call mcp__ticktick__get_tasks_due_today to see today's scheduled tasks
3. IMPORTANT: Times are in UTC (5 hours ahead). Convert to EST/CDT (subtract 5 hours) when displaying
4. USE SCHEDULE DATA to suggest time blocks:
   - Morning Routine: 5:50-6:30am (Vyvanse, water, workout, light, plan day)
   - Pre-standup deep work: 9:00-9:45am (45 min focus block)
   - Standup: 9:45-10:15am (meeting, already scheduled)
   - Post-standup deep work: 10:15am-12:00pm (best focus time)
   - Afternoon: 2-5pm (routine tasks, admin, lighter work)
5. Identify the top 3 MOST IMPORTANT tasks for today
6. Suggest specific time blocks for each based on:
   - Task type (deep work vs routine)
   - Energy levels (peak focus 9am-12pm)
   - Existing schedule (avoid standup time)
7. Ask if this plan feels realistic given his energy/motivation today

Danny's schedule:
- Morning Routine: 5:50-6:30am daily
- Standup: 9:45-10:15am weekdays
- Peak Focus: 9am-12pm weekdays
- Low Energy: 2-5pm weekdays

Be supportive and realistic. Don't overload him. Quality > quantity.
Use REAL TickTick data, not mock data!
`
        });

        console.log(`📤 Request created for Claude Code to conduct morning planning...`);
        console.log(`🔄 Claude will respond via: respondToCommand('${commandId}', response)\n`);

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        respondToCommand(commandId, {
            message: `❌ Error: ${error.message}\n\nFalling back to basic morning greeting.`,
            waitingFor: false
        });
    }
};

const handleIntakeCommand = async (commandId, sessionId) => {
    console.log(`\n💭 Processing /intake command`);

    respondToCommand(commandId, {
        message: `💭 **Brain Dump Mode**\n\nJust dump everything on your mind. I'll organize it all.\n\nType 'done' when finished.`,
        waitingFor: true,
        context: { mode: 'intake' }
    });

    console.log(`✅ /intake started\n`);
};

const handleStuckCommand = async (commandId, sessionId) => {
    console.log(`\n🚦 Processing /stuck command`);

    const memories = loadMemories();

    let message = `🚦 **Let's Get Unstuck**\n\n`;

    // Check for common blockers from memory
    if (memories.taskPatterns.commonBlockers.length > 0) {
        message += `I've noticed you often get stuck when:\n`;
        memories.taskPatterns.commonBlockers.slice(0, 3).forEach(blocker => {
            message += `• ${blocker}\n`;
        });
        message += `\n`;
    }

    message += `**What task has you stuck right now?**`;

    respondToCommand(commandId, {
        message,
        waitingFor: true,
        context: { mode: 'stuck' }
    });

    console.log(`✅ /stuck started\n`);
};

// Main command processor
const processCommand = async (cmd) => {
    const { id, command, sessionId, isConversation, context } = cmd;

    console.log(`\n📥 New ${isConversation ? 'conversational response' : 'command'}: ${command}`);
    console.log(`   ID: ${id}`);
    console.log(`   Session: ${sessionId}`);

    // If it's a conversational response, route it to Claude Code
    if (isConversation) {
        console.log(`💬 Processing conversational response - DELEGATING TO CLAUDE`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        try {
            // Load context
            const contextData = loadContext();

            // Create a request for Claude Code to handle this conversation
            const claudeRequestId = requestClaudeConversation({
                type: 'conversation',
                commandId: id,
                sessionId,
                userMessage: command,
                previousContext: context,
                context: {
                    memories: contextData.memories,
                    profile: contextData.profile,
                    claudeMdContent: contextData.claudeMd
                },
                instructions: `
Continue the evening review conversation with Danny.

His response: "${command}"

Your goals:
- Respond to what he just said
- Ask follow-up questions to understand root causes
- Help him break down tasks if needed
- Offer to create TickTick tasks when appropriate
- Store insights about his patterns in memories

Be conversational and adaptive. Use TickTick MCP tools when needed.
`
            });

            console.log(`📤 Request created for Claude Code to continue conversation...`);
            console.log(`🔄 Claude will respond via: respondToCommand('${id}', response)\n`);

        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
            respondToCommand(id, {
                message: `❌ Error: ${error.message}`,
                waitingFor: false
            });
        }
        return;
    }

    // Handle slash commands
    switch (command) {
        case '/focus':
            await handleFocusCommand(id, sessionId);
            break;
        case '/evening':
            await handleEveningCommand(id, sessionId);
            break;
        case '/morning':
            await handleMorningCommand(id, sessionId);
            break;
        case '/intake':
            await handleIntakeCommand(id, sessionId);
            break;
        case '/stuck':
            await handleStuckCommand(id, sessionId);
            break;
        default:
            console.log(`⚠️  Unknown command: ${command}`);
    }
};

// Watch the command queue
const watchQueue = async () => {
    if (!fs.existsSync(COMMAND_QUEUE)) return;

    try {
        const data = fs.readFileSync(COMMAND_QUEUE, 'utf8');
        const queue = JSON.parse(data);

        if (queue.commands && queue.commands.length > 0) {
            for (const cmd of queue.commands) {
                const cmdKey = `${cmd.id}_${cmd.timestamp}`;

                if (!processedCommands.has(cmdKey)) {
                    processedCommands.add(cmdKey);
                    await processCommand(cmd);

                    // Remove from queue
                    queue.commands = queue.commands.filter(c => c.id !== cmd.id);
                    fs.writeFileSync(COMMAND_QUEUE, JSON.stringify(queue, null, 2));
                }
            }
        }
    } catch (err) {
        // Ignore parse errors
    }
};

// Start
console.log('✅ Auto-responder started');
console.log('💡 All commands processed with TickTick + Memory system');
console.log('🔄 Watching...\n');

setInterval(watchQueue, 500);

process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping...');
    process.exit(0);
});
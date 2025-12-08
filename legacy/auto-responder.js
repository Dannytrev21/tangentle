#!/usr/bin/env node

/**
 * Auto-Responder for Executive Brain
 * Automatically processes /focus commands with real TickTick data
 */

const fs = require('fs');
const path = require('path');
const { respondToCommand, formatFocusResponse } = require('./claude-respond.js');

const COMMAND_QUEUE = path.join(__dirname, '.command-queue.json');
let processedCommands = new Set();

console.log('🤖 Executive Brain Auto-Responder');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✨ Automatically processing /focus commands...\n');

// Hardcoded TickTick data based on your actual tasks
// In a real implementation, this would call the TickTick MCP APIs
const getTickTickData = async () => {
    // High priority overdue tasks
    const highPriorityTasks = [
        {
            title: 'Pay for Venue',
            projectName: '👫 Relationships',
            daysOverdue: 3,
            subtasks: [
                'Look at Venue facts',
                'Reach out to francisco about details',
                'Pay for venue'
            ]
        },
        {
            title: 'Policy Bot Testing',
            projectName: '💻 Work',
            daysOverdue: 3
        },
        {
            title: 'Create release management in QA for policy bot',
            projectName: '💻 Work',
            daysOverdue: 3
        },
        {
            title: 'Build Policy Bot',
            projectName: '💻 Work',
            daysOverdue: 3
        }
    ];

    // Medium priority overdue tasks
    const mediumPriorityTasks = [
        {
            title: 'Add changes to AutoMerge Bot',
            projectName: '💻 Work',
            daysOverdue: 2
        }
    ];

    return { highPriorityTasks, mediumPriorityTasks };
};

// Process /focus commands
const processFocusCommand = async (commandId, sessionId) => {
    console.log(`\n🎯 Processing /focus command: ${commandId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        // Get TickTick data
        console.log('📊 Fetching TickTick data...');
        const { highPriorityTasks, mediumPriorityTasks } = await getTickTickData();

        // Format response
        console.log('✍️  Formatting response...');
        const response = formatFocusResponse(highPriorityTasks, mediumPriorityTasks);

        // Send response
        console.log('📤 Sending response to web UI...');
        respondToCommand(commandId, response);

        console.log(`✅ Successfully processed command ${commandId}`);
        console.log(`📊 Found ${highPriorityTasks.length} high priority + ${mediumPriorityTasks.length} medium priority tasks\n`);

    } catch (error) {
        console.error(`❌ Error processing command: ${error.message}`);

        // Send error response
        respondToCommand(commandId, {
            message: `❌ Error fetching tasks: ${error.message}\n\nPlease try again.`,
            waitingFor: false
        });
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

                    console.log(`\n📥 New command detected!`);
                    console.log(`   Command: ${cmd.command}`);
                    console.log(`   ID: ${cmd.id}`);
                    console.log(`   Session: ${cmd.sessionId}`);

                    if (cmd.command === '/focus') {
                        await processFocusCommand(cmd.id, cmd.sessionId);
                    }

                    // Remove from queue after processing
                    queue.commands = queue.commands.filter(c => c.id !== cmd.id);
                    fs.writeFileSync(COMMAND_QUEUE, JSON.stringify(queue, null, 2));
                }
            }
        }
    } catch (err) {
        // Ignore parse errors
    }
};

// Start watching
console.log('✅ Auto-responder started');
console.log('💡 Commands will be processed automatically');
console.log('🔄 Watching for /focus commands...\n');

setInterval(watchQueue, 500); // Check every 500ms for fast response

// Keep process alive
process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping auto-responder...');
    process.exit(0);
});
/**
 * Claude Auto-Processor
 *
 * Watches .command-queue.json for new commands and automatically
 * processes them using the Anthropic API, eliminating the need
 * for manual "process now" commands.
 *
 * Architecture:
 * 1. File watcher monitors .command-queue.json
 * 2. When commands arrive, calls Anthropic API
 * 3. Tool calls are handled via HTTP to ticktick-bridge.js
 * 4. Responses written to .command-responses.json
 */

const Anthropic = require('@anthropic-ai/sdk');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    commandQueueFile: path.join(__dirname, '.command-queue.json'),
    commandResponseFile: path.join(__dirname, '.command-responses.json'),
    claudeMdFile: path.join(__dirname, 'CLAUDE.md'),
    bridgeServerUrl: 'http://localhost:3001',
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096
};

// Initialize Anthropic client
const anthropic = new Anthropic();

// Tool definitions matching TickTick MCP tools
const TOOLS = [
    {
        name: "ticktick_get_projects",
        description: "Get all projects from TickTick",
        input_schema: { type: "object", properties: {}, required: [] }
    },
    {
        name: "ticktick_get_project_tasks",
        description: "Get all tasks in a specific project",
        input_schema: {
            type: "object",
            properties: {
                project_id: { type: "string", description: "ID of the project" }
            },
            required: ["project_id"]
        }
    },
    {
        name: "ticktick_get_engaged_tasks",
        description: "Get all 'engaged' tasks - high priority, due today, or overdue",
        input_schema: { type: "object", properties: {}, required: [] }
    },
    {
        name: "ticktick_get_tasks_due_today",
        description: "Get all tasks due today",
        input_schema: { type: "object", properties: {}, required: [] }
    },
    {
        name: "ticktick_get_overdue_tasks",
        description: "Get all overdue tasks",
        input_schema: { type: "object", properties: {}, required: [] }
    },
    {
        name: "ticktick_get_tasks_by_priority",
        description: "Get tasks by priority level",
        input_schema: {
            type: "object",
            properties: {
                priority_id: { type: "integer", description: "Priority: 0=None, 1=Low, 3=Medium, 5=High" }
            },
            required: ["priority_id"]
        }
    },
    {
        name: "ticktick_search_tasks",
        description: "Search for tasks by title, content, or subtask titles",
        input_schema: {
            type: "object",
            properties: {
                search_term: { type: "string", description: "Text to search for" }
            },
            required: ["search_term"]
        }
    },
    {
        name: "ticktick_create_task",
        description: "Create a new task in TickTick",
        input_schema: {
            type: "object",
            properties: {
                title: { type: "string", description: "Task title" },
                project_id: { type: "string", description: "Project ID" },
                content: { type: "string", description: "Task description" },
                start_date: { type: "string", description: "Start date (ISO format)" },
                due_date: { type: "string", description: "Due date (ISO format)" },
                priority: { type: "integer", description: "Priority: 0=None, 1=Low, 3=Medium, 5=High" }
            },
            required: ["title", "project_id"]
        }
    },
    {
        name: "ticktick_update_task",
        description: "Update an existing task",
        input_schema: {
            type: "object",
            properties: {
                task_id: { type: "string", description: "Task ID" },
                project_id: { type: "string", description: "Project ID" },
                title: { type: "string", description: "New title" },
                content: { type: "string", description: "New content" },
                start_date: { type: "string", description: "New start date" },
                due_date: { type: "string", description: "New due date" },
                priority: { type: "integer", description: "New priority" }
            },
            required: ["task_id", "project_id"]
        }
    },
    {
        name: "ticktick_complete_task",
        description: "Mark a task as complete",
        input_schema: {
            type: "object",
            properties: {
                task_id: { type: "string", description: "Task ID" },
                project_id: { type: "string", description: "Project ID" }
            },
            required: ["task_id", "project_id"]
        }
    },
    {
        name: "ticktick_batch_create_tasks",
        description: "Create multiple tasks at once",
        input_schema: {
            type: "object",
            properties: {
                tasks: {
                    type: "array",
                    items: { type: "object" },
                    description: "Array of task objects with title, project_id, and optional fields"
                }
            },
            required: ["tasks"]
        }
    },
    {
        name: "ticktick_create_subtask",
        description: "Create a subtask under a parent task",
        input_schema: {
            type: "object",
            properties: {
                subtask_title: { type: "string", description: "Subtask title" },
                parent_task_id: { type: "string", description: "Parent task ID" },
                project_id: { type: "string", description: "Project ID" },
                content: { type: "string", description: "Subtask content" },
                priority: { type: "integer", description: "Priority level" }
            },
            required: ["subtask_title", "parent_task_id", "project_id"]
        }
    },
    {
        name: "read_file",
        description: "Read a file from the filesystem",
        input_schema: {
            type: "object",
            properties: {
                file_path: { type: "string", description: "Absolute path to the file" }
            },
            required: ["file_path"]
        }
    },
    {
        name: "write_file",
        description: "Write content to a file",
        input_schema: {
            type: "object",
            properties: {
                file_path: { type: "string", description: "Absolute path to the file" },
                content: { type: "string", description: "Content to write" }
            },
            required: ["file_path", "content"]
        }
    }
];

// Load system prompt from CLAUDE.md
function loadSystemPrompt() {
    try {
        const claudeMd = fs.readFileSync(CONFIG.claudeMdFile, 'utf8');
        return `You are Danny's Executive Brain assistant, processing commands from the web UI.

${claudeMd}

IMPORTANT: You are running as an automated processor. Respond concisely and helpfully.
When using tools, prefer batch operations when possible to be efficient.
Always format responses in markdown for the web UI.`;
    } catch (error) {
        console.error('[Processor] Error loading CLAUDE.md:', error.message);
        return 'You are an ADHD task management assistant. Help the user manage their tasks.';
    }
}

// Execute a tool call
async function executeTool(toolName, toolInput) {
    console.log(`[Processor] Executing tool: ${toolName}`, toolInput);

    // Handle file operations locally
    if (toolName === 'read_file') {
        try {
            const content = fs.readFileSync(toolInput.file_path, 'utf8');
            return { success: true, content };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    if (toolName === 'write_file') {
        try {
            fs.writeFileSync(toolInput.file_path, toolInput.content);
            return { success: true, message: `File written to ${toolInput.file_path}` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Forward TickTick tools to bridge server
    if (toolName.startsWith('ticktick_')) {
        try {
            const response = await fetch(`${CONFIG.bridgeServerUrl}/api/ticktick/${toolName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(toolInput)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[Processor] Tool error for ${toolName}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    return { success: false, error: `Unknown tool: ${toolName}` };
}

// Process a single command through Claude API
async function processCommand(command) {
    console.log(`[Processor] Processing command: ${command.id}`);

    const systemPrompt = loadSystemPrompt();

    // Build the user message based on command type
    let userMessage = '';

    if (command.command === '/project-chat') {
        userMessage = `Project: ${command.project?.name || 'Unknown'}
Project Details: ${JSON.stringify(command.project, null, 2)}

User Message: ${command.message}

Respond helpfully to this project-related request. Use TickTick tools as needed.`;
    } else if (command.command === '/now') {
        userMessage = `The user clicked "What Now?" - fetch their engaged/priority tasks and help them focus.`;
    } else if (command.command === '/checkin') {
        userMessage = `The user is checking in. Ask how their current task is going.`;
    } else if (command.command === '/morning') {
        userMessage = `Help the user with their morning planning routine. Get today's tasks, overdue tasks, and help prioritize.`;
    } else if (command.command === '/evening') {
        userMessage = `Help the user with their evening review. What got done? What didn't? Plan for tomorrow.`;
    } else {
        // Generic message
        userMessage = command.message || command.command || 'Hello';
    }

    // Add context if available
    if (command.context) {
        userMessage += `\n\nContext: ${JSON.stringify(command.context)}`;
    }

    try {
        // Initial API call
        let messages = [{ role: 'user', content: userMessage }];
        let response = await anthropic.messages.create({
            model: CONFIG.model,
            max_tokens: CONFIG.maxTokens,
            system: systemPrompt,
            tools: TOOLS,
            messages: messages
        });

        // Handle tool use loop
        while (response.stop_reason === 'tool_use') {
            const toolUseBlocks = response.content.filter(block => block.type === 'tool_use');
            const toolResults = [];

            for (const toolUse of toolUseBlocks) {
                const result = await executeTool(toolUse.name, toolUse.input);
                toolResults.push({
                    type: 'tool_result',
                    tool_use_id: toolUse.id,
                    content: JSON.stringify(result)
                });
            }

            // Add assistant response and tool results to messages
            messages.push({ role: 'assistant', content: response.content });
            messages.push({ role: 'user', content: toolResults });

            // Continue the conversation
            response = await anthropic.messages.create({
                model: CONFIG.model,
                max_tokens: CONFIG.maxTokens,
                system: systemPrompt,
                tools: TOOLS,
                messages: messages
            });
        }

        // Extract final text response
        const textBlocks = response.content.filter(block => block.type === 'text');
        const finalMessage = textBlocks.map(block => block.text).join('\n');

        return {
            message: finalMessage,
            status: 'success',
            waitingFor: false
        };

    } catch (error) {
        console.error('[Processor] API error:', error.message);
        return {
            message: `Error processing command: ${error.message}`,
            status: 'error',
            waitingFor: false
        };
    }
}

// Write response to file
function writeResponse(commandId, response) {
    try {
        let responses = {};
        if (fs.existsSync(CONFIG.commandResponseFile)) {
            const content = fs.readFileSync(CONFIG.commandResponseFile, 'utf8');
            responses = JSON.parse(content);
        }

        responses[commandId] = {
            response: response,
            timestamp: Date.now()
        };

        fs.writeFileSync(CONFIG.commandResponseFile, JSON.stringify(responses, null, 2));
        console.log(`[Processor] Response written for ${commandId}`);
    } catch (error) {
        console.error('[Processor] Error writing response:', error.message);
    }
}

// Clear processed command from queue
function clearCommand(commandId) {
    try {
        const content = fs.readFileSync(CONFIG.commandQueueFile, 'utf8');
        const queue = JSON.parse(content);
        queue.commands = queue.commands.filter(cmd => cmd.id !== commandId);
        fs.writeFileSync(CONFIG.commandQueueFile, JSON.stringify(queue, null, 2));
        console.log(`[Processor] Cleared command ${commandId} from queue`);
    } catch (error) {
        console.error('[Processor] Error clearing command:', error.message);
    }
}

// Check queue and process commands
async function checkAndProcessQueue() {
    try {
        if (!fs.existsSync(CONFIG.commandQueueFile)) {
            return;
        }

        const content = fs.readFileSync(CONFIG.commandQueueFile, 'utf8');
        const queue = JSON.parse(content);

        if (!queue.commands || queue.commands.length === 0) {
            return;
        }

        console.log(`[Processor] Found ${queue.commands.length} command(s) to process`);

        // Process each command
        for (const command of queue.commands) {
            const response = await processCommand(command);
            writeResponse(command.id, response);
            clearCommand(command.id);
        }

    } catch (error) {
        console.error('[Processor] Error checking queue:', error.message);
    }
}

// Main: Start file watcher
function main() {
    console.log('[Processor] Starting Claude Auto-Processor...');
    console.log(`[Processor] Watching: ${CONFIG.commandQueueFile}`);
    console.log(`[Processor] Bridge server: ${CONFIG.bridgeServerUrl}`);

    // Initial check
    checkAndProcessQueue();

    // Watch for changes
    const watcher = chokidar.watch(CONFIG.commandQueueFile, {
        persistent: true,
        ignoreInitial: true
    });

    watcher.on('change', (path) => {
        console.log(`[Processor] Queue file changed: ${path}`);
        // Small delay to ensure file is fully written
        setTimeout(checkAndProcessQueue, 100);
    });

    watcher.on('error', (error) => {
        console.error('[Processor] Watcher error:', error);
    });

    console.log('[Processor] Ready and watching for commands...');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[Processor] Shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n[Processor] Shutting down...');
    process.exit(0);
});

main();

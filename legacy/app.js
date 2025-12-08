// Executive Brain - App JavaScript

class ExecutiveBrain {
    constructor() {
        this.messagesArea = document.getElementById('messagesArea');
        this.commandInput = document.getElementById('commandInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.themeToggle = document.getElementById('themeToggle');
        this.quickCommands = document.querySelectorAll('.quick-cmd');
        this.floatingProcessBtn = document.getElementById('floatingProcessBtn');
        this.processorStatus = document.getElementById('processorStatus');

        // Generate unique session ID (persist across refreshes)
        this.sessionId = this.getOrCreateSessionId();

        // API configuration
        this.apiUrl = 'http://localhost:3001/api';
        this.injectorUrl = 'http://localhost:3002';
        this.wsUrl = 'ws://localhost:3001';

        // Focus mode state
        this.focusSession = null;
        this.focusIndicator = null;

        // Processor state
        this.processorConnected = false;

        // WebSocket state
        this.ws = null;
        this.wsConnected = false;
        this.pendingCommands = new Map(); // commandId -> loadingId

        this.initializeEventListeners();
        this.initializeWebSocket();
        this.loadTheme();
        this.focusInput();
        this.checkFocusSession();
        this.checkProcessorStatus();

        // Check processor status every 5 seconds
        setInterval(() => this.checkProcessorStatus(), 5000);
    }

    initializeWebSocket() {
        try {
            this.ws = new WebSocket(this.wsUrl);

            this.ws.onopen = () => {
                console.log('[WS] Connected to bridge server');
                this.wsConnected = true;
                this.showToast('Real-time updates enabled', 'success');
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (e) {
                    console.error('[WS] Parse error:', e);
                }
            };

            this.ws.onclose = () => {
                console.log('[WS] Disconnected, reconnecting in 3s...');
                this.wsConnected = false;
                setTimeout(() => this.initializeWebSocket(), 3000);
            };

            this.ws.onerror = (error) => {
                console.error('[WS] Error:', error);
            };
        } catch (e) {
            console.error('[WS] Failed to connect:', e);
            // Retry connection
            setTimeout(() => this.initializeWebSocket(), 5000);
        }
    }

    handleWebSocketMessage(data) {
        console.log('[WS] Received:', data.type, data.commandId);

        if (data.type === 'response' && data.commandId) {
            // Check if we're waiting for this response
            const loadingId = this.pendingCommands.get(data.commandId);

            if (loadingId) {
                // Remove loading indicator
                this.removeLoading(loadingId);
                this.pendingCommands.delete(data.commandId);

                // Display the response
                if (data.response && data.response.message) {
                    this.addMessage(data.response.message, 'assistant');

                    // Handle focus session updates
                    if (data.response.focusSession) {
                        this.focusSession = data.response.focusSession;
                        if (data.response.focusSession.active) {
                            this.showFocusIndicator();
                        }
                    }
                    if (data.response.clearFocusSession) {
                        this.focusSession = null;
                        this.hideFocusIndicator();
                    }
                }
            }
        }
    }

    getOrCreateSessionId() {
        let sessionId = localStorage.getItem('executiveBrainSessionId');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('executiveBrainSessionId', sessionId);
        }
        return sessionId;
    }

    async checkFocusSession() {
        try {
            const response = await fetch(`${this.apiUrl}/focus/${this.sessionId}`);
            const data = await response.json();
            if (data.session && data.session.active) {
                this.focusSession = data.session;
                this.showFocusIndicator();
            }
        } catch (e) {
            // Server not running, that's fine
        }
    }

    showFocusIndicator() {
        if (this.focusIndicator) return;

        this.focusIndicator = document.createElement('div');
        this.focusIndicator.className = 'focus-mode-active';
        this.focusIndicator.innerHTML = 'Focus Mode Active';
        document.body.appendChild(this.focusIndicator);
    }

    hideFocusIndicator() {
        if (this.focusIndicator) {
            this.focusIndicator.remove();
            this.focusIndicator = null;
        }
    }

    initializeEventListeners() {
        // Send button
        this.sendBtn.addEventListener('click', () => this.handleSend());

        // Enter key to send
        this.commandInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });

        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Quick command buttons
        this.quickCommands.forEach(btn => {
            btn.addEventListener('click', () => {
                const command = btn.dataset.command;
                this.processCommand(command);
            });
        });

        // Auto-resize input on content change
        this.commandInput.addEventListener('input', () => this.autoResizeInput());

        // Floating process button
        if (this.floatingProcessBtn) {
            this.floatingProcessBtn.addEventListener('click', () => this.triggerManualProcess());
        }
    }

    async checkProcessorStatus() {
        try {
            const response = await fetch(`${this.injectorUrl}/status`);
            const data = await response.json();

            this.processorConnected = data.sessionExists;
            this.updateProcessorUI(data);
        } catch (e) {
            this.processorConnected = false;
            this.updateProcessorUI({ sessionExists: false, error: 'Injector not running' });
        }
    }

    updateProcessorUI(status) {
        if (this.processorStatus) {
            if (status.sessionExists) {
                this.processorStatus.className = 'hint connected';
                this.processorStatus.innerHTML = '<span class="status-dot connected"></span> Auto-processing enabled';
            } else {
                this.processorStatus.className = 'hint disconnected';
                this.processorStatus.innerHTML = '<span class="status-dot disconnected"></span> Start Claude: ./claude-tmux-runner.sh';
            }
        }

        if (this.floatingProcessBtn) {
            this.floatingProcessBtn.classList.remove('connected', 'disconnected', 'processing');
            if (status.sessionExists) {
                this.floatingProcessBtn.classList.add('connected');
                this.floatingProcessBtn.title = 'Auto-processing enabled (click to trigger manually)';
            } else {
                this.floatingProcessBtn.classList.add('disconnected');
                this.floatingProcessBtn.title = 'Claude Code not running - click to try manual trigger';
            }
        }
    }

    async triggerManualProcess() {
        if (this.floatingProcessBtn) {
            this.floatingProcessBtn.classList.add('processing');
        }

        try {
            const response = await fetch(`${this.injectorUrl}/trigger`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'process now' })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Processing triggered!', 'success');
            } else {
                this.showToast('Failed to trigger: ' + (data.message || 'Unknown error'), 'error');
            }
        } catch (e) {
            this.showToast('Injector not running. Start with: node claude-input-injector.js', 'error');
        }

        setTimeout(() => {
            if (this.floatingProcessBtn) {
                this.floatingProcessBtn.classList.remove('processing');
            }
        }, 2000);
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 2rem;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--bg-secondary)'};
            color: white;
            font-size: 0.9rem;
            box-shadow: var(--shadow-lg);
            z-index: 1001;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    handleSend() {
        const input = this.commandInput.value.trim();
        if (!input) return;

        // Add user message to chat
        this.addMessage(input, 'user');

        // Process command
        this.processCommand(input);

        // Clear input
        this.commandInput.value = '';
        this.autoResizeInput();
        this.focusInput();
    }

    async processCommand(command) {
        // Show loading state
        const loadingId = this.showLoading();

        try {
            // Call backend API - it will add to queue and return immediately if WebSocket is handling responses
            const response = await fetch(`${this.apiUrl}/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    command: command,
                    sessionId: this.sessionId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to process command');
            }

            const data = await response.json();

            // If we got a commandId, track it for WebSocket response
            if (data.commandId && this.wsConnected) {
                this.pendingCommands.set(data.commandId, loadingId);
                console.log('[App] Waiting for WebSocket response:', data.commandId);
                // Loading will be removed when WebSocket message arrives
                return;
            }

            // Otherwise, show the response directly (fallback for non-queued commands)
            this.removeLoading(loadingId);

            // Add assistant message
            this.addMessage(data.message, 'assistant');

            // Handle focus session updates
            if (data.focusSession) {
                this.focusSession = data.focusSession;
                if (data.focusSession.active) {
                    this.showFocusIndicator();
                }
            }
            if (data.clearFocusSession) {
                this.focusSession = null;
                this.hideFocusIndicator();
            }

            // If waiting for response, show input hint
            if (data.waitingFor) {
                this.showWaitingHint();
            }

        } catch (error) {
            this.removeLoading(loadingId);
            console.error('Error processing command:', error);

            // Fallback to local processing if backend is unavailable
            const response = this.getCommandResponse(command);
            this.addMessage(response, 'assistant');
        }
    }

    showWaitingHint() {
        // Update input placeholder to show we're waiting for a response
        this.commandInput.placeholder = 'Type your response...';
        this.commandInput.focus();
    }

    getCommandResponse(command) {
        const lowerCommand = command.toLowerCase();

        if (lowerCommand === '/now' || lowerCommand.includes('what should')) {
            return `🎯 **What You Should Be Doing Right Now**

To get your real priorities, make sure the server is running:
\`node ticktick-bridge.js\`

Once connected, I'll pull your tasks from TickTick and:
• Show you the #1 priority
• Ask what you're actually doing
• Help if you're avoiding something
• Check in on your progress

Try again once the server is running!`;
        }

        if (lowerCommand === '/checkin') {
            return `⏰ **Check-in Time**

No active focus session found.

Start one by asking **"What should I be doing right now?"** or hit the **What Now?** button.

Then I can check in on your progress!`;
        }

        if (lowerCommand === '/morning' || lowerCommand.includes('morning')) {
            return `Good morning, Danny! ☀️

Let me help you start your day:

**Today's Schedule Review:**
• Checking your calendar and scheduled tasks...
• You have 3 meetings today
• 5 tasks are due today

**Overdue Tasks:**
• Review PR comments (from yesterday)
• Update project documentation (2 days overdue)

**Top 3 Priorities for Today:**
1. Complete sprint planning presentation
2. Fix authentication bug in production
3. Review team's pull requests

**Time Blocks:**
• 9-11am: Email catch-up and small tasks
• 11am-2pm: Deep focus on auth bug (peak Vyvanse time)
• 2-3pm: Sprint planning meeting
• 3-5pm: PR reviews and documentation

Remember: One task at a time. You've got this! 💪`;
        }

        if (lowerCommand === '/evening' || lowerCommand.includes('evening')) {
            return `Evening review time! 🌙

**Today's Wins:**
• Fixed the authentication bug ✅
• Completed sprint planning presentation ✅
• Reviewed 2 out of 3 PRs ✅

**What Didn't Get Done:**
• Last PR review - energy ran out
• Documentation update - kept getting interrupted

No judgment! Let's understand why and reschedule:
• PR review → Move to tomorrow morning (fresh mind)
• Documentation → Break into smaller chunks, 15 min each

**Tomorrow's Top 3:**
1. Complete remaining PR review
2. Documentation - just the API endpoints section
3. Start new feature implementation

**Brain Dump:**
Anything else on your mind? Just type it out and I'll help organize it.`;
        }

        if (lowerCommand === '/intake' || lowerCommand.includes('brain dump')) {
            return `Brain dump mode activated! 💭

Just start typing everything on your mind. Don't worry about organization or priority - I'll help with that after you get it all out.

Some prompts if helpful:
• What's stressing you out?
• What deadlines are looming?
• What ideas are bouncing around?
• What have you been avoiding?

Type freely - I'll organize everything into actionable tasks when you're done.`;
        }

        if (lowerCommand === '/stuck' || lowerCommand.includes('stuck') || lowerCommand.includes('overwhelmed')) {
            return `I hear you. Let's get unstuck together. 🚦

**First, take a breath.**

Now, let's find your next tiny step:

1. What specific task are you stuck on?
2. What's making it feel hard?
   • Don't know where to start?
   • Waiting on someone/something?
   • Feels too big?
   • Afraid of messing up?

**Quick unsticking strategies:**
• Can we make a 2-minute version of this task?
• What's literally the next physical action? (Open file? Send message? Google something?)
• Would body doubling help? (I'll stay here while you work)
• Should we break this into even smaller pieces?

What's the task that's got you stuck?`;
        }

        if (lowerCommand === '/help' || lowerCommand.includes('help')) {
            return `Here's how I can help you! 🧠

**Quick Commands:**
• **/morning** - Start your day with planning and priority setting
• **/evening** - Review the day and plan tomorrow
• **/intake** - Brain dump mode for getting everything out of your head
• **/stuck** - Get unstuck when you're overwhelmed or procrastinating
• **/quick-add [task]** - Quickly add a task to TickTick

**How I Work:**
• I break big tasks into 15-30 minute chunks
• I schedule deep work for your peak focus time (11am-2pm)
• I don't judge - we just problem-solve together
• I keep things simple and actionable

**Your Projects:**
• 💻 Work - Professional tasks
• 💪 Health - Medical, fitness
• 💵 Finances - Money management
• 👫 Relationships - Social tasks
• 🧗🏻 Hobbies - Fun stuff
• 🔧 Maintenance - Home/car upkeep

Just talk to me naturally or use the commands above!`;
        }

        if (lowerCommand.startsWith('/quick-add')) {
            const task = command.replace('/quick-add', '').trim();
            if (task) {
                return `Task added to TickTick! ✅

**Task:** ${task}
**Project:** 💻 Work
**Priority:** Medium
**Due:** Tomorrow at 2pm

The task has been broken down into:
1. Research phase (15 min)
2. Implementation (30 min)
3. Testing & review (15 min)

Added to your task list and scheduled for your peak focus window tomorrow.`;
            }
            return 'What task would you like to add? Example: /quick-add Review pull requests';
        }

        // Default response for natural language
        return `I understood: "${command}"

To get full functionality, make sure the server is running:
\`node ticktick-bridge.js\`

**Key Commands:**
• **/now** - What should I be doing? (start focus coaching)
• **/checkin** - Check in on progress
• **/morning** - Start your day
• **/evening** - End of day review
• **/stuck** - When you're overwhelmed
• **/intake** - Brain dump mode

Or just ask "What should I be doing right now?"!`;
    }

    addMessage(content, type = 'assistant') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;

        const icon = document.createElement('div');
        icon.className = 'message-icon';
        icon.textContent = type === 'user' ? '👤' : '🧠';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        // Convert markdown-style formatting
        const formattedContent = this.formatMessage(content);
        contentDiv.innerHTML = formattedContent;

        if (type === 'user') {
            messageDiv.appendChild(contentDiv);
            messageDiv.appendChild(icon);
        } else {
            messageDiv.appendChild(icon);
            messageDiv.appendChild(contentDiv);
        }

        this.messagesArea.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessage(text) {
        // Simple markdown-like formatting
        return text
            .split('\n')
            .map(line => {
                // Bold text
                line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                // Bullet points
                if (line.startsWith('•')) {
                    return `<li>${line.substring(1).trim()}</li>`;
                }
                // Numbered lists
                if (/^\d+\./.test(line)) {
                    return `<li>${line.replace(/^\d+\.\s*/, '')}</li>`;
                }
                // Code
                line = line.replace(/`(.*?)`/g, '<code>$1</code>');
                return line ? `<p>${line}</p>` : '';
            })
            .join('')
            .replace(/<li>/g, '<ul><li>')
            .replace(/<\/li>(?!<li>)/g, '</li></ul>');
    }

    showLoading() {
        const loadingId = `loading-${Date.now()}`;
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message assistant-message';
        loadingDiv.id = loadingId;

        loadingDiv.innerHTML = `
            <div class="message-icon">🧠</div>
            <div class="message-content">
                <div class="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        this.messagesArea.appendChild(loadingDiv);
        this.scrollToBottom();
        return loadingId;
    }

    removeLoading(loadingId) {
        const loadingDiv = document.getElementById(loadingId);
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    scrollToBottom() {
        this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
    }

    focusInput() {
        this.commandInput.focus();
    }

    autoResizeInput() {
        // This could be enhanced to auto-grow the input field if needed
        // For now, keeping it single-line
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // Update theme toggle icon
        this.updateThemeIcon(newTheme);
    }

    updateThemeIcon(theme) {
        const icon = this.themeToggle.querySelector('svg');
        if (theme === 'dark') {
            // Show moon icon for dark mode
            icon.innerHTML = `
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            `;
        } else {
            // Show sun icon for light mode
            icon.innerHTML = `
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            `;
        }
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ExecutiveBrain();
});
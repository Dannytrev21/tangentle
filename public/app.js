// Executive Brain - App JavaScript
// Modern ADHD-Friendly Interface with Focus Mode

class ExecutiveBrain {
    constructor() {
        // Core elements
        this.messagesArea = document.getElementById('messagesArea');
        this.commandInput = document.getElementById('commandInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.themeToggle = document.getElementById('themeToggle');
        this.processorStatus = document.getElementById('processorStatus');

        // Sidebar elements
        this.appLayout = document.getElementById('appLayout');
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.mobileMenuBtn = document.getElementById('mobileMenuBtn');
        this.sidebarOverlay = document.getElementById('sidebarOverlay');

        // Focus mode elements
        this.focusModeBtn = document.getElementById('focusModeBtn');
        this.focusExitBtn = document.getElementById('focusExitBtn');
        this.quickActions = document.getElementById('quickActions');

        // Current task widget elements
        this.currentTaskWidget = document.getElementById('currentTaskWidget');
        this.currentTaskTitle = document.getElementById('currentTaskTitle');
        this.currentTaskProject = document.getElementById('currentTaskProject');
        this.currentTaskTimer = document.getElementById('currentTaskTimer');
        this.taskDoneBtn = document.getElementById('taskDoneBtn');
        this.taskStuckBtn = document.getElementById('taskStuckBtn');
        this.taskBreakBtn = document.getElementById('taskBreakBtn');

        // Quick action buttons
        this.actionButtons = document.querySelectorAll('.action-btn');

        // Generate unique session ID (persist across refreshes)
        this.sessionId = this.getOrCreateSessionId();

        // API configuration
        this.apiUrl = 'http://localhost:3001/api';
        this.injectorUrl = 'http://localhost:3002';
        this.wsUrl = 'ws://localhost:3001';

        // Focus mode state
        this.focusMode = false;
        this.focusSession = null;
        this.taskTimer = null;
        this.taskStartTime = null;

        // Processor state
        this.processorConnected = false;

        // WebSocket state
        this.ws = null;
        this.wsConnected = false;
        this.pendingCommands = new Map();

        // Sidebar state
        this.sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';

        this.initialize();
    }

    initialize() {
        this.initializeEventListeners();
        this.initializeWebSocket();
        this.initializeSidebar();
        this.initializeFocusMode();
        this.initializeCurrentTask();
        this.loadTheme();
        this.focusInput();
        this.checkFocusSession();
        this.checkProcessorStatus();

        // Check processor status every 5 seconds
        setInterval(() => this.checkProcessorStatus(), 5000);
    }

    // ===================
    // Focus Mode
    // ===================

    initializeFocusMode() {
        if (this.focusModeBtn) {
            this.focusModeBtn.addEventListener('click', () => this.toggleFocusMode());
        }

        if (this.focusExitBtn) {
            this.focusExitBtn.addEventListener('click', () => this.exitFocusMode());
        }

        // Check for saved focus mode state
        if (localStorage.getItem('focusMode') === 'true') {
            this.enterFocusMode();
        }
    }

    toggleFocusMode() {
        if (this.focusMode) {
            this.exitFocusMode();
        } else {
            this.enterFocusMode();
        }
    }

    enterFocusMode() {
        this.focusMode = true;
        this.appLayout.classList.add('focus-mode');
        this.focusModeBtn.classList.add('active');
        this.focusExitBtn.style.display = 'flex';
        localStorage.setItem('focusMode', 'true');
        this.showToast('Focus Mode enabled - distractions hidden', 'success');
    }

    exitFocusMode() {
        this.focusMode = false;
        this.appLayout.classList.remove('focus-mode');
        this.focusModeBtn.classList.remove('active');
        this.focusExitBtn.style.display = 'none';
        localStorage.setItem('focusMode', 'false');
    }

    // ===================
    // Current Task Widget
    // ===================

    initializeCurrentTask() {
        if (this.taskDoneBtn) {
            this.taskDoneBtn.addEventListener('click', () => this.handleTaskDone());
        }
        if (this.taskStuckBtn) {
            this.taskStuckBtn.addEventListener('click', () => this.handleTaskStuck());
        }
        if (this.taskBreakBtn) {
            this.taskBreakBtn.addEventListener('click', () => this.handleTaskBreak());
        }

        // Restore active task from session
        const savedTask = localStorage.getItem('currentTask');
        if (savedTask) {
            try {
                const task = JSON.parse(savedTask);
                this.setCurrentTask(task);
            } catch (e) {
                localStorage.removeItem('currentTask');
            }
        }
    }

    setCurrentTask(task) {
        if (!task) {
            this.hideCurrentTask();
            return;
        }

        this.focusSession = {
            active: true,
            task: task,
            startedAt: task.startedAt || Date.now()
        };

        if (this.currentTaskTitle) {
            this.currentTaskTitle.textContent = task.title;
        }
        if (this.currentTaskProject) {
            this.currentTaskProject.textContent = task.project || '';
        }

        this.taskStartTime = this.focusSession.startedAt;
        this.startTaskTimer();

        if (this.currentTaskWidget) {
            this.currentTaskWidget.style.display = 'block';
        }

        // Save to localStorage
        localStorage.setItem('currentTask', JSON.stringify({
            ...task,
            startedAt: this.focusSession.startedAt
        }));
    }

    hideCurrentTask() {
        this.focusSession = null;
        this.taskStartTime = null;

        if (this.taskTimer) {
            clearInterval(this.taskTimer);
            this.taskTimer = null;
        }

        if (this.currentTaskWidget) {
            this.currentTaskWidget.style.display = 'none';
        }

        localStorage.removeItem('currentTask');
    }

    startTaskTimer() {
        if (this.taskTimer) {
            clearInterval(this.taskTimer);
        }

        const updateTimer = () => {
            if (!this.taskStartTime) return;

            const elapsed = Date.now() - this.taskStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);

            if (this.currentTaskTimer) {
                this.currentTaskTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        };

        updateTimer();
        this.taskTimer = setInterval(updateTimer, 1000);
    }

    handleTaskDone() {
        if (this.focusSession && this.focusSession.task) {
            const elapsed = Date.now() - this.taskStartTime;
            const minutes = Math.floor(elapsed / 60000);

            this.addMessage(`Done with "${this.focusSession.task.title}"`, 'user');
            this.processCommand('/done');
        }
        this.hideCurrentTask();
    }

    handleTaskStuck() {
        this.processCommand('/stuck');
    }

    handleTaskBreak() {
        if (this.focusSession && this.focusSession.task) {
            const taskTitle = this.focusSession.task.title;
            this.addMessage(`Taking a break from "${taskTitle}"`, 'user');

            this.addMessage(
                `**Take a proper break!**\n\nYou've been working on "${taskTitle}". Here are some break ideas:\n\n` +
                `- Stand up and stretch\n` +
                `- Get some water\n` +
                `- Look away from the screen\n` +
                `- Take a short walk\n\n` +
                `I'll keep your task saved. Come back when you're ready!`,
                'assistant',
                ['Resume task', 'Switch task', 'I\'m done for now']
            );
        }
    }

    // ===================
    // Sidebar Management
    // ===================

    initializeSidebar() {
        if (this.sidebarCollapsed) {
            this.sidebar.classList.add('collapsed');
        }

        if (this.sidebarToggle) {
            this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        if (this.mobileMenuBtn) {
            this.mobileMenuBtn.addEventListener('click', () => this.openMobileSidebar());
        }

        if (this.sidebarOverlay) {
            this.sidebarOverlay.addEventListener('click', () => this.closeMobileSidebar());
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.sidebar.classList.contains('open')) {
                this.closeMobileSidebar();
            }
        });
    }

    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        this.sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
        localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed);
    }

    openMobileSidebar() {
        this.sidebar.classList.add('open');
        this.sidebarOverlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }

    closeMobileSidebar() {
        this.sidebar.classList.remove('open');
        this.sidebarOverlay.classList.remove('visible');
        document.body.style.overflow = '';
    }

    // ===================
    // WebSocket
    // ===================

    initializeWebSocket() {
        try {
            this.ws = new WebSocket(this.wsUrl);

            this.ws.onopen = () => {
                console.log('[WS] Connected to server');
                this.wsConnected = true;
                this.showToast('Connected to Executive Brain', 'success');
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
            setTimeout(() => this.initializeWebSocket(), 5000);
        }
    }

    handleWebSocketMessage(data) {
        console.log('[WS] Received:', data.type, data.commandId);

        if (data.type === 'response' && data.commandId) {
            const loadingId = this.pendingCommands.get(data.commandId);

            if (loadingId) {
                this.removeLoading(loadingId);
                this.pendingCommands.delete(data.commandId);

                if (data.response && data.response.message) {
                    // Check for quick responses
                    const quickResponses = data.response.quickResponses || this.getQuickResponses(data.response.message);
                    this.addMessage(data.response.message, 'assistant', quickResponses);

                    // Handle focus session updates
                    if (data.response.focusSession) {
                        this.setCurrentTask(data.response.focusSession.intendedTask);
                    }
                    if (data.response.clearFocusSession) {
                        this.hideCurrentTask();
                    }
                }
            }
        }
    }

    // ===================
    // Session Management
    // ===================

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
            if (data.session && data.session.active && data.session.intendedTask) {
                this.setCurrentTask(data.session.intendedTask);
            }
        } catch (e) {
            // Server not running, that's fine
        }
    }

    // ===================
    // Event Listeners
    // ===================

    initializeEventListeners() {
        this.sendBtn.addEventListener('click', () => this.handleSend());

        this.commandInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });

        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        this.actionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const command = btn.dataset.command;
                if (command) {
                    this.processCommand(command);
                }
            });
        });
    }

    // ===================
    // Processor Status
    // ===================

    async checkProcessorStatus() {
        try {
            const response = await fetch(`${this.apiUrl}/health`);
            const data = await response.json();

            this.processorConnected = data.status === 'ok' || data.status === 'running';
            this.updateProcessorUI(this.processorConnected);
        } catch (e) {
            this.processorConnected = false;
            this.updateProcessorUI(false);
        }
    }

    updateProcessorUI(connected) {
        if (this.processorStatus) {
            const label = this.processorStatus.querySelector('.nav-label');

            if (connected) {
                this.processorStatus.className = 'status-indicator connected';
                if (label) label.textContent = 'Connected';
            } else {
                this.processorStatus.className = 'status-indicator disconnected';
                if (label) label.textContent = 'Offline';
            }
        }
    }

    // ===================
    // Toast Notifications
    // ===================

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toast-out 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ===================
    // Command Processing
    // ===================

    handleSend() {
        const input = this.commandInput.value.trim();
        if (!input) return;

        this.addMessage(input, 'user');
        this.processCommand(input);

        this.commandInput.value = '';
        this.focusInput();
    }

    async processCommand(command) {
        const loadingId = this.showLoading();

        try {
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

            if (data.commandId) {
                this.pendingCommands.set(data.commandId, loadingId);
                console.log('[App] Waiting for response:', data.commandId);
                this.startPollingForResponse(data.commandId, loadingId);
                return;
            }

            this.removeLoading(loadingId);
            const quickResponses = data.quickResponses || this.getQuickResponses(data.message);
            this.addMessage(data.message, 'assistant', quickResponses);

            if (data.focusSession && data.focusSession.intendedTask) {
                this.setCurrentTask(data.focusSession.intendedTask);
            }
            if (data.clearFocusSession) {
                this.hideCurrentTask();
            }

        } catch (error) {
            this.removeLoading(loadingId);
            console.error('Error processing command:', error);

            const response = this.getCommandResponse(command);
            this.addMessage(response.message, 'assistant', response.quickResponses);
        }
    }

    startPollingForResponse(commandId, loadingId) {
        const maxAttempts = 60;
        let attempts = 0;

        const poll = async () => {
            if (!this.pendingCommands.has(commandId)) {
                return;
            }

            attempts++;
            if (attempts > maxAttempts) {
                console.log('[App] Polling timeout for:', commandId);
                this.removeLoading(loadingId);
                this.pendingCommands.delete(commandId);
                this.addMessage('Request timed out. Please try again.', 'assistant');
                return;
            }

            try {
                const response = await fetch(`${this.apiUrl}/response/${commandId}`);
                const data = await response.json();

                if (data.found && data.response) {
                    console.log('[App] Polling found response for:', commandId);
                    this.removeLoading(loadingId);
                    this.pendingCommands.delete(commandId);

                    if (data.response.message) {
                        const quickResponses = data.response.quickResponses || this.getQuickResponses(data.response.message);
                        this.addMessage(data.response.message, 'assistant', quickResponses);
                    }

                    if (data.response.focusSession && data.response.focusSession.intendedTask) {
                        this.setCurrentTask(data.response.focusSession.intendedTask);
                    }
                    if (data.response.clearFocusSession) {
                        this.hideCurrentTask();
                    }
                    return;
                }
            } catch (e) {
                console.error('[App] Polling error:', e);
            }

            setTimeout(poll, 1000);
        };

        setTimeout(poll, 1000);
    }

    // ===================
    // Quick Responses
    // ===================

    getQuickResponses(message) {
        const lowerMessage = message.toLowerCase();

        // Avoidance coaching responses
        if (lowerMessage.includes('too big') || lowerMessage.includes('overwhelming')) {
            return ['2-minute version', 'Break it down', 'First step only'];
        }

        if (lowerMessage.includes('what are you actually doing') || lowerMessage.includes('what\'s making it feel hard')) {
            return ['Working on it', 'Something else', 'Avoiding it'];
        }

        if (lowerMessage.includes('pick a number') || lowerMessage.includes('what\'s making it feel hard')) {
            return ['1 - Too big', '2 - Unclear', '3 - Boring', '4 - Scary'];
        }

        // Morning/Evening
        if (lowerMessage.includes('good morning') || lowerMessage.includes('start your day')) {
            return ['Show my tasks', 'Top 3 priorities', 'Check calendar'];
        }

        if (lowerMessage.includes('evening review')) {
            return ['What got done', 'Plan tomorrow', 'Brain dump'];
        }

        // Task confirmation
        if (lowerMessage.includes('add it') || lowerMessage.includes('smart defaults')) {
            return ['Add it', 'Add with deadline', 'Break it down first'];
        }

        // Check-in responses
        if (lowerMessage.includes('how\'s it going') || lowerMessage.includes('check-in')) {
            return ['Making progress', 'Stuck', 'Finished!', 'Got distracted'];
        }

        return null;
    }

    getCommandResponse(command) {
        const lowerCommand = command.toLowerCase();

        if (lowerCommand === '/now' || lowerCommand.includes('what should')) {
            return {
                message: `**What You Should Be Doing Right Now**\n\nTo get your real priorities, make sure the server is running.\n\nOnce connected, I'll pull your tasks from TickTick and:\n- Show you the #1 priority\n- Ask what you're actually doing\n- Help if you're avoiding something\n- Check in on your progress\n\nTry again once the server is running!`,
                quickResponses: ['Retry', 'Show all tasks', 'Add a task']
            };
        }

        if (lowerCommand === '/checkin') {
            return {
                message: `**Check-in Time**\n\nNo active focus session found.\n\nStart one by clicking **What Now?** or asking "What should I be doing right now?"\n\nThen I can check in on your progress!`,
                quickResponses: ['What Now?', 'Add a task']
            };
        }

        if (lowerCommand === '/morning' || lowerCommand.includes('morning')) {
            return {
                message: `Good morning! Let me help you start your day.\n\n**Quick Start:**\n1. Review today's calendar\n2. Check overdue tasks\n3. Pick your top 3 priorities\n4. Time block your peak focus hours\n\nWhat would you like to start with?`,
                quickResponses: ['Show my tasks', 'Top 3 priorities', 'Check overdue']
            };
        }

        if (lowerCommand === '/evening' || lowerCommand.includes('evening')) {
            return {
                message: `Evening review time!\n\n**Let's wrap up:**\n1. What got done today?\n2. What didn't get done? (No judgment!)\n3. Set tomorrow's top 3 priorities\n4. Brain dump anything still on your mind\n\nReady to review?`,
                quickResponses: ['What got done', 'Plan tomorrow', 'Brain dump']
            };
        }

        if (lowerCommand === '/stuck' || lowerCommand.includes('stuck')) {
            return {
                message: `I hear you. Let's get unstuck together.\n\n**First, take a breath.**\n\nWhat's making it feel hard right now?\n1. Too big - don't know where to start\n2. Unclear - not sure what to do\n3. Boring - brain wants something else\n4. Scary - afraid of messing up\n5. Blocked - waiting on something\n6. Distracted - can't focus\n7. Low energy - too tired\n8. Overwhelmed - too many things\n\nPick a number, and I'll help with specific strategies.`,
                quickResponses: ['1 - Too big', '2 - Unclear', '3 - Boring', '4 - Scary']
            };
        }

        if (lowerCommand === '/add' || lowerCommand.startsWith('/add ')) {
            const task = command.replace('/add', '').trim();
            if (task) {
                return {
                    message: `Got it - let me help you capture: **"${task}"**\n\n**Quick questions:**\n- Is there a deadline?\n- Is this for work or personal?\n- Does this feel big or small?\n\nOr just say "add it" and I'll use smart defaults.`,
                    quickResponses: ['Add it', 'Add with deadline', 'Break it down first']
                };
            }
            return {
                message: `What task would you like to add?\n\nJust tell me what you need to do and I'll help:\n- Break it into small steps\n- Pick the right project\n- Set a realistic deadline`,
                quickResponses: null
            };
        }

        return {
            message: `I understood: "${command}"\n\n**Key Commands:**\n- **/now** - What should I be doing?\n- **/add** - Add a new task\n- **/stuck** - Get unstuck\n- **/morning** - Start your day\n- **/evening** - End of day review\n\nOr just tell me what's on your mind!`,
            quickResponses: ['What Now?', 'Add a task', 'I\'m stuck']
        };
    }

    // ===================
    // Message Display
    // ===================

    addMessage(content, type = 'assistant', quickResponses = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = type === 'user' ? '👤' : '🧠';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.innerHTML = this.formatMessage(content);

        // Add quick response buttons
        if (quickResponses && quickResponses.length > 0 && type === 'assistant') {
            const responsesDiv = document.createElement('div');
            responsesDiv.className = 'quick-responses';

            quickResponses.forEach(response => {
                const btn = document.createElement('button');
                btn.className = 'quick-response-btn';
                btn.textContent = response;
                btn.addEventListener('click', () => {
                    this.addMessage(response, 'user');
                    this.processCommand(response);
                    // Remove quick responses after clicking
                    responsesDiv.remove();
                });
                responsesDiv.appendChild(btn);
            });

            bubble.appendChild(responsesDiv);
        }

        if (type === 'user') {
            messageDiv.appendChild(bubble);
            messageDiv.appendChild(avatar);
        } else {
            messageDiv.appendChild(avatar);
            messageDiv.appendChild(bubble);
        }

        this.messagesArea.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessage(text) {
        // Enhanced markdown-like formatting
        let html = text
            .split('\n')
            .map(line => {
                // Headers (### Header)
                if (line.startsWith('### ')) {
                    return `<h3>${line.substring(4)}</h3>`;
                }

                // Bold text
                line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

                // Italic text
                line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');

                // Code
                line = line.replace(/`(.*?)`/g, '<code>$1</code>');

                // Bullet points
                if (line.startsWith('•') || line.startsWith('- ')) {
                    const content = line.replace(/^[•-]\s*/, '');
                    return `<li>${content}</li>`;
                }

                // Numbered lists
                if (/^\d+\.\s/.test(line)) {
                    return `<li>${line.replace(/^\d+\.\s*/, '')}</li>`;
                }

                // Horizontal rule
                if (line === '---') {
                    return '<hr>';
                }

                return line ? `<p>${line}</p>` : '';
            })
            .join('');

        // Wrap consecutive list items in ul/ol tags
        html = html
            .replace(/<li>/g, '<ul><li>')
            .replace(/<\/li>(?!<li>)/g, '</li></ul>');

        // Clean up nested ul tags
        html = html.replace(/<\/ul><ul>/g, '');

        return html;
    }

    showLoading() {
        const loadingId = `loading-${Date.now()}`;
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message assistant-message';
        loadingDiv.id = loadingId;

        loadingDiv.innerHTML = `
            <div class="message-avatar">🧠</div>
            <div class="message-bubble">
                <div class="typing-indicator">
                    <span>Thinking</span>
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
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

    // ===================
    // Theme Management
    // ===================

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeToggle(newTheme);
    }

    updateThemeToggle(theme) {
        if (!this.themeToggle) return;

        const icon = this.themeToggle.querySelector('svg');
        const label = this.themeToggle.querySelector('.nav-label');

        if (theme === 'dark') {
            icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
            if (label) label.textContent = 'Dark Mode';
        } else {
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
            if (label) label.textContent = 'Light Mode';
        }
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeToggle(savedTheme);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ExecutiveBrain();
});

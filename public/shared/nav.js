// Executive Brain - Shared Navigation Component
// This file provides the sidebar navigation for all pages

class SharedNavigation {
    constructor(currentPage) {
        this.currentPage = currentPage;
        this.sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        this.init();
    }

    init() {
        this.injectSidebar();
        this.injectOverlay();
        this.setupEventListeners();
        this.loadTheme();
    }

    injectSidebar() {
        const sidebar = document.createElement('aside');
        sidebar.className = `sidebar ${this.sidebarCollapsed ? 'collapsed' : ''}`;
        sidebar.id = 'sidebar';

        sidebar.innerHTML = `
            <div class="sidebar-header">
                <div class="logo">
                    <span class="logo-icon">🧠</span>
                    <span class="logo-text">Executive Brain</span>
                </div>
                <button class="sidebar-toggle" id="sidebarToggle" aria-label="Toggle sidebar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 18l-6-6 6-6"/>
                    </svg>
                </button>
            </div>

            <nav class="sidebar-nav">
                <a href="index.html" class="nav-item ${this.currentPage === 'chat' ? 'active' : ''}" data-page="chat">
                    <span class="nav-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </span>
                    <span class="nav-label">Chat</span>
                </a>
                <a href="schedule.html" class="nav-item ${this.currentPage === 'schedule' ? 'active' : ''}" data-page="schedule">
                    <span class="nav-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                    </span>
                    <span class="nav-label">Schedule</span>
                </a>
                <a href="projects.html" class="nav-item ${this.currentPage === 'projects' ? 'active' : ''}" data-page="projects">
                    <span class="nav-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </span>
                    <span class="nav-label">Projects</span>
                </a>
                <a href="guide.html" class="nav-item ${this.currentPage === 'guide' ? 'active' : ''}" data-page="guide">
                    <span class="nav-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </span>
                    <span class="nav-label">Guide</span>
                </a>
            </nav>

            <div class="sidebar-footer">
                <button class="nav-item theme-toggle" id="themeToggle">
                    <span class="nav-icon">
                        <svg class="sun-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="5"></circle>
                            <line x1="12" y1="1" x2="12" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="23"></line>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                            <line x1="1" y1="12" x2="3" y2="12"></line>
                            <line x1="21" y1="12" x2="23" y2="12"></line>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                        </svg>
                    </span>
                    <span class="nav-label">Light Mode</span>
                </button>
                <div class="status-indicator" id="processorStatus">
                    <span class="status-dot"></span>
                    <span class="nav-label">Connecting...</span>
                </div>
            </div>
        `;

        // Insert sidebar as first child of .app-layout (not document.body)
        // This maintains the flex layout: sidebar + main-content
        const appLayout = document.querySelector('.app-layout');
        if (appLayout) {
            appLayout.insertBefore(sidebar, appLayout.firstChild);
        } else {
            // Fallback for pages without app-layout
            document.body.insertBefore(sidebar, document.body.firstChild);
        }
    }

    injectOverlay() {
        // Check if overlay already exists (some pages have it in HTML)
        if (document.getElementById('sidebarOverlay')) {
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.id = 'sidebarOverlay';

        // Insert overlay inside .app-layout to maintain layout
        const appLayout = document.querySelector('.app-layout');
        if (appLayout) {
            appLayout.appendChild(overlay);
        } else {
            document.body.appendChild(overlay);
        }
    }

    injectMobileMenuButton(headerElement) {
        if (!headerElement) return;

        const btn = document.createElement('button');
        btn.className = 'mobile-menu-btn';
        btn.id = 'mobileMenuBtn';
        btn.setAttribute('aria-label', 'Open menu');
        btn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
        `;
        headerElement.insertBefore(btn, headerElement.firstChild);
    }

    setupEventListeners() {
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // Mobile menu button
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => this.openMobileSidebar());
        }

        // Sidebar overlay
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.closeMobileSidebar());
        }

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMobileSidebar();
            }
        });

        // Check processor status
        this.checkProcessorStatus();
        setInterval(() => this.checkProcessorStatus(), 5000);
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        this.sidebarCollapsed = !this.sidebarCollapsed;
        sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
        localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed);
    }

    openMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        sidebar.classList.add('open');
        overlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }

    closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        sidebar.classList.remove('open');
        overlay.classList.remove('visible');
        document.body.style.overflow = '';
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeToggle(newTheme);
    }

    updateThemeToggle(theme) {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        const icon = themeToggle.querySelector('svg');
        const label = themeToggle.querySelector('.nav-label');

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

    async checkProcessorStatus() {
        const status = document.getElementById('processorStatus');
        if (!status) return;

        try {
            const response = await fetch('http://localhost:3001/api/health');
            const data = await response.json();
            const connected = data.status === 'ok' || data.status === 'running';

            const label = status.querySelector('.nav-label');
            if (connected) {
                status.className = 'status-indicator connected';
                if (label) label.textContent = 'Connected';
            } else {
                status.className = 'status-indicator disconnected';
                if (label) label.textContent = 'Offline';
            }
        } catch (e) {
            const label = status.querySelector('.nav-label');
            status.className = 'status-indicator disconnected';
            if (label) label.textContent = 'Offline';
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SharedNavigation;
}

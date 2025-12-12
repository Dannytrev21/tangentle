/**
 * AI Memory Service for Executive Brain
 * Manages shared context between Gemini and Claude Opus
 * Tracks scheduling decisions, patterns, and insights
 */

const fs = require('fs');
const path = require('path');

const MEMORY_FILE = path.join(__dirname, '../../data/ai-memory.json');
const MAX_RECENT_DECISIONS = 20;
const MAX_PATTERNS = 10;

class AIMemoryService {
    constructor() {
        this.memory = null;
        this._load();
    }

    /**
     * Load memory from disk
     */
    _load() {
        try {
            if (fs.existsSync(MEMORY_FILE)) {
                const content = fs.readFileSync(MEMORY_FILE, 'utf8');
                this.memory = JSON.parse(content);
                console.log('[AI Memory] Loaded from disk');
            } else {
                this._initializeDefault();
            }
        } catch (error) {
            console.error('[AI Memory] Failed to load, initializing default:', error.message);
            this._initializeDefault();
        }
    }

    /**
     * Initialize with default structure
     */
    _initializeDefault() {
        this.memory = {
            lastUpdated: null,
            recentDecisions: [],
            observedPatterns: [],
            currentContext: {
                todayDate: null,
                tasksScheduled: 0,
                tasksCompleted: 0,
                tasksRescheduled: 0,
                currentEnergyLevel: 'medium',
                lastReprioritization: null
            },
            userPreferences: {
                peakFocusHours: { start: '09:00', end: '12:00' },
                adminHours: { start: '13:00', end: '17:00' },
                maxDailyWorkMinutes: 360,
                defaultBufferMinutes: 10,
                defaultTaskDuration: 30,
                medicationKickInTime: '07:00',
                energyDipTime: { start: '14:00', end: '16:00' }
            },
            schedulingStats: {
                totalReprioritizations: 0,
                tasksRescheduledAllTime: 0,
                averageProcessingTime: 0,
                mostCommonRescheduleReason: null
            },
            forClaudeOpus: {
                summary: 'No AI scheduling sessions yet.',
                recentPatterns: [],
                actionableInsights: []
            }
        };
        this._save();
    }

    /**
     * Save memory to disk
     */
    _save() {
        try {
            this.memory.lastUpdated = new Date().toISOString();
            fs.writeFileSync(MEMORY_FILE, JSON.stringify(this.memory, null, 2));
            console.log('[AI Memory] Saved to disk');
        } catch (error) {
            console.error('[AI Memory] Failed to save:', error.message);
        }
    }

    /**
     * Get current memory state
     */
    getMemory() {
        return { ...this.memory };
    }

    /**
     * Add a scheduling decision to history
     * @param {object} decision - The scheduling decision
     */
    addDecision(decision) {
        const entry = {
            timestamp: new Date().toISOString(),
            energyLevel: decision.energyLevel || 'medium',
            taskCount: decision.taskCount || 0,
            scheduledCount: decision.scheduledCount || 0,
            rescheduledCount: decision.rescheduledCount || 0,
            rescheduledTasks: decision.rescheduledTasks || [],
            warnings: decision.warnings || [],
            thinking: decision.thinking || '',
            processingTime: decision.processingTime || 0
        };

        this.memory.recentDecisions.unshift(entry);

        // Keep only recent decisions
        if (this.memory.recentDecisions.length > MAX_RECENT_DECISIONS) {
            this.memory.recentDecisions = this.memory.recentDecisions.slice(0, MAX_RECENT_DECISIONS);
        }

        // Update stats
        this.memory.schedulingStats.totalReprioritizations++;
        this.memory.schedulingStats.tasksRescheduledAllTime += entry.rescheduledCount;

        // Update average processing time
        const totalProcessingTime = this.memory.recentDecisions.reduce(
            (sum, d) => sum + (d.processingTime || 0), 0
        );
        this.memory.schedulingStats.averageProcessingTime = Math.round(
            totalProcessingTime / this.memory.recentDecisions.length
        );

        // Track most common reschedule reasons
        this._updateRescheduleReasons(entry.rescheduledTasks);

        this._save();
        return entry;
    }

    /**
     * Update most common reschedule reason
     */
    _updateRescheduleReasons(rescheduledTasks) {
        if (!rescheduledTasks || rescheduledTasks.length === 0) return;

        const reasons = {};
        for (const task of rescheduledTasks) {
            const reason = task.reason || 'unspecified';
            reasons[reason] = (reasons[reason] || 0) + 1;
        }

        // Find most common
        let maxCount = 0;
        let mostCommon = null;
        for (const [reason, count] of Object.entries(reasons)) {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = reason;
            }
        }

        if (mostCommon) {
            this.memory.schedulingStats.mostCommonRescheduleReason = mostCommon;
        }
    }

    /**
     * Add an observed pattern
     * @param {object} pattern - The observed pattern
     */
    addPattern(pattern) {
        const entry = {
            timestamp: new Date().toISOString(),
            type: pattern.type || 'general',
            description: pattern.description || '',
            frequency: pattern.frequency || 1,
            context: pattern.context || {}
        };

        // Check if similar pattern exists
        const existingIndex = this.memory.observedPatterns.findIndex(
            p => p.type === entry.type && p.description === entry.description
        );

        if (existingIndex >= 0) {
            // Update frequency
            this.memory.observedPatterns[existingIndex].frequency++;
            this.memory.observedPatterns[existingIndex].lastSeen = entry.timestamp;
        } else {
            this.memory.observedPatterns.unshift(entry);
        }

        // Keep only recent patterns
        if (this.memory.observedPatterns.length > MAX_PATTERNS) {
            this.memory.observedPatterns = this.memory.observedPatterns.slice(0, MAX_PATTERNS);
        }

        this._updateClaudeContext();
        this._save();
        return entry;
    }

    /**
     * Update current context (today's state)
     * @param {object} context - Current context updates
     */
    updateContext(context) {
        const today = new Date().toISOString().split('T')[0];

        // Reset counts if it's a new day
        if (this.memory.currentContext.todayDate !== today) {
            this.memory.currentContext.todayDate = today;
            this.memory.currentContext.tasksScheduled = 0;
            this.memory.currentContext.tasksCompleted = 0;
            this.memory.currentContext.tasksRescheduled = 0;
        }

        // Apply updates
        Object.assign(this.memory.currentContext, context);
        this.memory.currentContext.lastReprioritization = new Date().toISOString();

        this._save();
        return this.memory.currentContext;
    }

    /**
     * Increment task counts
     */
    incrementScheduled(count = 1) {
        this.memory.currentContext.tasksScheduled += count;
        this._save();
    }

    incrementCompleted(count = 1) {
        this.memory.currentContext.tasksCompleted += count;
        this._save();
    }

    incrementRescheduled(count = 1) {
        this.memory.currentContext.tasksRescheduled += count;
        this._save();
    }

    /**
     * Get summarized context for Claude Opus
     * Returns a digest of recent activity and patterns
     */
    getClaudeContext() {
        this._updateClaudeContext();
        return this.memory.forClaudeOpus;
    }

    /**
     * Update the Claude Opus context summary
     */
    _updateClaudeContext() {
        const ctx = this.memory.currentContext;
        const stats = this.memory.schedulingStats;
        const decisions = this.memory.recentDecisions;
        const patterns = this.memory.observedPatterns;

        // Generate summary
        let summary = '';
        if (stats.totalReprioritizations === 0) {
            summary = 'No AI scheduling sessions yet.';
        } else {
            summary = `Danny has used AI scheduling ${stats.totalReprioritizations} times. `;
            summary += `Today: ${ctx.tasksScheduled} scheduled, ${ctx.tasksCompleted} completed, ${ctx.tasksRescheduled} rescheduled. `;

            if (stats.mostCommonRescheduleReason) {
                summary += `Most common reason for rescheduling: "${stats.mostCommonRescheduleReason}". `;
            }

            // Recent energy levels
            const recentEnergy = decisions.slice(0, 5).map(d => d.energyLevel);
            const lowEnergyCount = recentEnergy.filter(e => e === 'low').length;
            if (lowEnergyCount >= 3) {
                summary += 'Recent sessions show low energy levels - consider checking in about wellness. ';
            }
        }

        // Extract recent patterns
        const recentPatterns = patterns
            .filter(p => p.frequency > 1)
            .slice(0, 5)
            .map(p => p.description);

        // Generate actionable insights
        const insights = [];

        // Check for overload pattern
        const recentWarnings = decisions.slice(0, 5).flatMap(d => d.warnings || []);
        const overloadWarnings = recentWarnings.filter(w =>
            w.toLowerCase().includes('overload') || w.toLowerCase().includes('too many')
        );
        if (overloadWarnings.length >= 2) {
            insights.push('Danny may be taking on too many tasks. Consider helping prioritize ruthlessly.');
        }

        // Check for frequent rescheduling
        const recentRescheduled = decisions.slice(0, 5).reduce((sum, d) => sum + (d.rescheduledCount || 0), 0);
        if (recentRescheduled >= 5) {
            insights.push('Tasks are frequently being rescheduled. May indicate unrealistic planning or avoidance.');
        }

        // Check for energy pattern
        if (ctx.currentEnergyLevel === 'low' && new Date().getHours() < 14) {
            insights.push('Low energy before afternoon - unusual. Check if basic needs are met.');
        }

        this.memory.forClaudeOpus = {
            summary,
            recentPatterns,
            actionableInsights: insights,
            lastDecision: decisions[0] || null,
            currentContext: { ...ctx }
        };
    }

    /**
     * Update user preferences
     * @param {object} preferences - Preference updates
     */
    updatePreferences(preferences) {
        Object.assign(this.memory.userPreferences, preferences);
        this._save();
        return this.memory.userPreferences;
    }

    /**
     * Get user preferences
     */
    getPreferences() {
        return { ...this.memory.userPreferences };
    }

    /**
     * Prune old data to keep memory bounded
     */
    pruneOldData() {
        // Already handled by MAX constants in add methods
        // This method can be called periodically for maintenance

        // Remove patterns not seen in 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        this.memory.observedPatterns = this.memory.observedPatterns.filter(p => {
            const lastSeen = new Date(p.lastSeen || p.timestamp);
            return lastSeen > thirtyDaysAgo;
        });

        this._save();
        console.log('[AI Memory] Pruned old data');
    }

    /**
     * Get scheduling stats
     */
    getStats() {
        return { ...this.memory.schedulingStats };
    }

    /**
     * Reset current day context (for testing or new day)
     */
    resetDayContext() {
        this.memory.currentContext = {
            todayDate: new Date().toISOString().split('T')[0],
            tasksScheduled: 0,
            tasksCompleted: 0,
            tasksRescheduled: 0,
            currentEnergyLevel: 'medium',
            lastReprioritization: null
        };
        this._save();
    }
}

// Export singleton instance
module.exports = new AIMemoryService();

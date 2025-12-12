/**
 * Settings Service for Executive Brain
 * Manages user settings with persistence, validation, and hot-reload
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

const VALID_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const VALID_THEMES = ['light', 'dark', 'system'];
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const DEFAULT_SETTINGS = {
    version: "1.0",
    lastUpdated: null,

    schedule: {
        workDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        workHours: { start: "09:00", end: "17:00" },
        peakFocusWindow: { start: "09:00", end: "12:00" },
        lowEnergyPeriod: { start: "14:00", end: "16:00" },
        medicationTime: "06:00",
        medicationKickIn: "07:00"
    },

    tasks: {
        defaultDuration: 30,
        bufferMinutes: 10,
        maxDailyMinutes: 360,
        preferredSizeRange: { min: 15, max: 30 },
        maxTasksByEnergy: { low: 2, medium: 4, high: 6 }
    },

    rules: {
        deepFocusMorningOnly: true,
        meetingPreference: "afternoon",
        autoRescheduleLowPriority: true,
        breakReminderMinutes: 90
    },

    routines: [
        {
            id: "morning-routine",
            name: "Morning Routine",
            time: "07:00",
            duration: 60,
            days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
            enabled: true
        },
        {
            id: "evening-review",
            name: "Evening Review",
            time: "17:00",
            duration: 15,
            days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
            enabled: true
        }
    ],

    display: {
        theme: "system",
        defaultView: "chat",
        showCompletedTasks: false
    }
};

class SettingsService {
    constructor() {
        this.settings = null;
        this.watcher = null;
        this._load();
        this._setupWatcher();
    }

    /**
     * Validate time format (HH:MM)
     */
    _isValidTime(time) {
        return typeof time === 'string' && TIME_REGEX.test(time);
    }

    /**
     * Validate time range object
     */
    _isValidTimeRange(range) {
        return range &&
            typeof range === 'object' &&
            this._isValidTime(range.start) &&
            this._isValidTime(range.end);
    }

    /**
     * Validate a positive number
     */
    _isPositiveNumber(num) {
        return typeof num === 'number' && num > 0;
    }

    /**
     * Validate day names
     */
    _areValidDays(days) {
        return Array.isArray(days) &&
            days.length > 0 &&
            days.every(day => VALID_DAYS.includes(day.toLowerCase()));
    }

    /**
     * Validate schedule settings
     */
    _validateSchedule(schedule) {
        const errors = [];

        if (!this._areValidDays(schedule.workDays)) {
            errors.push('workDays must be an array of valid day names');
        }
        if (!this._isValidTimeRange(schedule.workHours)) {
            errors.push('workHours must have valid start and end times (HH:MM)');
        }
        if (!this._isValidTimeRange(schedule.peakFocusWindow)) {
            errors.push('peakFocusWindow must have valid start and end times (HH:MM)');
        }
        if (!this._isValidTimeRange(schedule.lowEnergyPeriod)) {
            errors.push('lowEnergyPeriod must have valid start and end times (HH:MM)');
        }
        if (!this._isValidTime(schedule.medicationTime)) {
            errors.push('medicationTime must be valid time (HH:MM)');
        }
        if (!this._isValidTime(schedule.medicationKickIn)) {
            errors.push('medicationKickIn must be valid time (HH:MM)');
        }

        return errors;
    }

    /**
     * Validate tasks settings
     */
    _validateTasks(tasks) {
        const errors = [];

        if (!this._isPositiveNumber(tasks.defaultDuration)) {
            errors.push('defaultDuration must be a positive number');
        }
        if (!this._isPositiveNumber(tasks.bufferMinutes)) {
            errors.push('bufferMinutes must be a positive number');
        }
        if (!this._isPositiveNumber(tasks.maxDailyMinutes)) {
            errors.push('maxDailyMinutes must be a positive number');
        }
        if (!tasks.preferredSizeRange ||
            !this._isPositiveNumber(tasks.preferredSizeRange.min) ||
            !this._isPositiveNumber(tasks.preferredSizeRange.max)) {
            errors.push('preferredSizeRange must have positive min and max values');
        }
        if (!tasks.maxTasksByEnergy ||
            !this._isPositiveNumber(tasks.maxTasksByEnergy.low) ||
            !this._isPositiveNumber(tasks.maxTasksByEnergy.medium) ||
            !this._isPositiveNumber(tasks.maxTasksByEnergy.high)) {
            errors.push('maxTasksByEnergy must have positive low, medium, and high values');
        }

        return errors;
    }

    /**
     * Validate rules settings
     */
    _validateRules(rules) {
        const errors = [];

        if (typeof rules.deepFocusMorningOnly !== 'boolean') {
            errors.push('deepFocusMorningOnly must be a boolean');
        }
        if (typeof rules.meetingPreference !== 'string') {
            errors.push('meetingPreference must be a string');
        }
        if (typeof rules.autoRescheduleLowPriority !== 'boolean') {
            errors.push('autoRescheduleLowPriority must be a boolean');
        }
        if (!this._isPositiveNumber(rules.breakReminderMinutes)) {
            errors.push('breakReminderMinutes must be a positive number');
        }

        return errors;
    }

    /**
     * Validate routines array
     */
    _validateRoutines(routines) {
        const errors = [];

        if (!Array.isArray(routines)) {
            errors.push('routines must be an array');
            return errors;
        }

        routines.forEach((routine, index) => {
            if (!routine.id || typeof routine.id !== 'string') {
                errors.push(`Routine ${index}: id must be a non-empty string`);
            }
            if (!routine.name || typeof routine.name !== 'string') {
                errors.push(`Routine ${index}: name must be a non-empty string`);
            }
            if (!this._isValidTime(routine.time)) {
                errors.push(`Routine ${index}: time must be valid (HH:MM)`);
            }
            if (!this._isPositiveNumber(routine.duration)) {
                errors.push(`Routine ${index}: duration must be a positive number`);
            }
            if (!this._areValidDays(routine.days)) {
                errors.push(`Routine ${index}: days must be valid day names`);
            }
            if (typeof routine.enabled !== 'boolean') {
                errors.push(`Routine ${index}: enabled must be a boolean`);
            }
        });

        return errors;
    }

    /**
     * Validate display settings
     */
    _validateDisplay(display) {
        const errors = [];

        if (!VALID_THEMES.includes(display.theme)) {
            errors.push(`theme must be one of: ${VALID_THEMES.join(', ')}`);
        }
        if (typeof display.defaultView !== 'string') {
            errors.push('defaultView must be a string');
        }
        if (typeof display.showCompletedTasks !== 'boolean') {
            errors.push('showCompletedTasks must be a boolean');
        }

        return errors;
    }

    /**
     * Validate entire settings object
     */
    _validate(settings) {
        const errors = [];

        if (settings.schedule) {
            errors.push(...this._validateSchedule(settings.schedule));
        }
        if (settings.tasks) {
            errors.push(...this._validateTasks(settings.tasks));
        }
        if (settings.rules) {
            errors.push(...this._validateRules(settings.rules));
        }
        if (settings.routines) {
            errors.push(...this._validateRoutines(settings.routines));
        }
        if (settings.display) {
            errors.push(...this._validateDisplay(settings.display));
        }

        return errors;
    }

    /**
     * Deep merge objects (source into target)
     */
    _deepMerge(target, source) {
        const result = { ...target };

        for (const key of Object.keys(source)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this._deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }

    /**
     * Load settings from disk
     */
    _load() {
        try {
            if (fs.existsSync(SETTINGS_FILE)) {
                const content = fs.readFileSync(SETTINGS_FILE, 'utf8');
                const loaded = JSON.parse(content);

                // Merge with defaults to ensure all fields exist
                this.settings = this._deepMerge(DEFAULT_SETTINGS, loaded);
                console.log('[Settings] Loaded from disk');
            } else {
                this._initializeDefault();
            }
        } catch (error) {
            console.error('[Settings] Failed to load, initializing default:', error.message);
            this._initializeDefault();
        }
    }

    /**
     * Initialize with default settings
     */
    _initializeDefault() {
        this.settings = { ...DEFAULT_SETTINGS };
        this._save();
        console.log('[Settings] Initialized with defaults');
    }

    /**
     * Save settings to disk
     */
    _save() {
        try {
            this.settings.lastUpdated = new Date().toISOString();

            // Ensure data directory exists
            const dataDir = path.dirname(SETTINGS_FILE);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2));
            console.log('[Settings] Saved to disk');
        } catch (error) {
            console.error('[Settings] Failed to save:', error.message);
            throw error;
        }
    }

    /**
     * Setup file watcher for hot-reload
     */
    _setupWatcher() {
        try {
            this.watcher = chokidar.watch(SETTINGS_FILE, {
                persistent: true,
                ignoreInitial: true,
                awaitWriteFinish: {
                    stabilityThreshold: 300,
                    pollInterval: 100
                }
            });

            this.watcher.on('change', () => {
                console.log('[Settings] File changed externally, reloading...');
                // Use async read to avoid blocking
                fs.readFile(SETTINGS_FILE, 'utf8', (err, content) => {
                    if (err) {
                        console.error('[Settings] Failed to reload:', err.message);
                        return;
                    }
                    try {
                        const loaded = JSON.parse(content);
                        const errors = this._validate(loaded);
                        if (errors.length > 0) {
                            console.error('[Settings] Invalid settings in file:', errors);
                            return;
                        }
                        this.settings = this._deepMerge(DEFAULT_SETTINGS, loaded);
                        console.log('[Settings] Reloaded successfully');
                    } catch (parseError) {
                        console.error('[Settings] Failed to parse reloaded settings:', parseError.message);
                    }
                });
            });

            console.log('[Settings] File watcher initialized');
        } catch (error) {
            console.error('[Settings] Failed to setup watcher:', error.message);
        }
    }

    /**
     * Load settings from file (public method)
     */
    loadSettings() {
        this._load();
        return this.getSettings();
    }

    /**
     * Save settings with validation
     * @param {object} settings - Complete settings object
     */
    saveSettings(settings) {
        const errors = this._validate(settings);
        if (errors.length > 0) {
            throw new Error(`Invalid settings: ${errors.join('; ')}`);
        }

        this.settings = this._deepMerge(DEFAULT_SETTINGS, settings);
        this._save();
        return this.getSettings();
    }

    /**
     * Get current settings (cached)
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Get schedule settings
     */
    getScheduleSettings() {
        return { ...this.settings.schedule };
    }

    /**
     * Get task settings
     */
    getTaskSettings() {
        return { ...this.settings.tasks };
    }

    /**
     * Get rules settings
     */
    getRulesSettings() {
        return { ...this.settings.rules };
    }

    /**
     * Get routines array
     */
    getRoutines() {
        return [...this.settings.routines];
    }

    /**
     * Get display settings
     */
    getDisplaySettings() {
        return { ...this.settings.display };
    }

    /**
     * Reset all settings to defaults
     */
    resetToDefaults() {
        this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        this._save();
        console.log('[Settings] Reset to defaults');
        return this.getSettings();
    }

    /**
     * Update a specific category with partial updates
     * @param {string} category - Category name (schedule, tasks, rules, routines, display)
     * @param {object} updates - Partial updates to apply
     */
    updateCategory(category, updates) {
        const validCategories = ['schedule', 'tasks', 'rules', 'routines', 'display'];

        if (!validCategories.includes(category)) {
            throw new Error(`Invalid category: ${category}. Valid: ${validCategories.join(', ')}`);
        }

        // Handle routines as array replacement
        if (category === 'routines') {
            if (!Array.isArray(updates)) {
                throw new Error('routines updates must be an array');
            }
            const testSettings = { ...this.settings, routines: updates };
            const errors = this._validateRoutines(updates);
            if (errors.length > 0) {
                throw new Error(`Invalid routines: ${errors.join('; ')}`);
            }
            this.settings.routines = updates;
        } else {
            // Merge updates into category
            const merged = this._deepMerge(this.settings[category], updates);

            // Validate the merged category
            const validator = {
                schedule: this._validateSchedule.bind(this),
                tasks: this._validateTasks.bind(this),
                rules: this._validateRules.bind(this),
                display: this._validateDisplay.bind(this)
            };

            const errors = validator[category](merged);
            if (errors.length > 0) {
                throw new Error(`Invalid ${category} settings: ${errors.join('; ')}`);
            }

            this.settings[category] = merged;
        }

        this._save();
        console.log(`[Settings] Updated ${category}`);
        return this.settings[category];
    }

    /**
     * Close the file watcher (for cleanup)
     */
    close() {
        if (this.watcher) {
            this.watcher.close();
            console.log('[Settings] File watcher closed');
        }
    }
}

// Export singleton instance
module.exports = new SettingsService();

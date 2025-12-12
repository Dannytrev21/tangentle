# Settings Page Implementation - AI Agent Prompts

## Tree of Thought: Optimal Prompting Strategy

### What Makes an Effective AI Agent Prompt?

#### Hypothesis A: Simple Task Description
- Just describe what to do
- **Verdict:** Too basic - AI may miss edge cases, no self-correction

#### Hypothesis B: Structured Context + Acceptance Criteria
- Include: context, goal, files to read/modify, acceptance criteria
- **Verdict:** Good foundation but may miss nuances

#### Hypothesis C: Chain of Thought + Verification
- Ask AI to think step by step
- Include verification steps after implementation
- Add self-correction instructions
- **Verdict:** Best for complex tasks - catches errors early

#### Hypothesis D: Few-shot Examples + Patterns
- Show examples of good implementations
- Reference existing patterns
- **Verdict:** Excellent for consistency with codebase

### **Selected Strategy: B + C + D Combined**

Each prompt includes:
1. **Role** - Set expertise and constraints
2. **Context** - Why this step matters, dependencies
3. **Required Reading** - Files to read BEFORE coding
4. **Goal** - Clear, measurable objective
5. **Implementation Spec** - Detailed requirements
6. **Patterns to Follow** - Reference existing code
7. **Acceptance Criteria** - Checkboxes for completion
8. **Self-Verification** - Commands to test the work
9. **Error Recovery** - What to do if tests fail
10. **Do NOT** - Common mistakes to avoid

---

## How to Use These Prompts

### Running a Step
```
Copy the prompt for the step you want to implement.
Paste it to Claude Code or your AI agent.
The AI will read required files, implement, test, and self-correct.
```

### Prompt Variables
Replace these placeholders if needed:
- `{PROJECT_ROOT}` → `/Users/dannytrevino/development/executive-brain`

### Verification Commands
Each prompt includes test commands. Run them to verify success before moving to the next step.

---

## Step 1.1: Create Settings Service

### Prompt

```
You are an expert Node.js developer implementing a settings service for an ADHD task management app called Executive Brain.

## Context
Executive Brain currently has hardcoded user preferences scattered across multiple files. We need a centralized settings service that:
- Loads settings from `data/settings.json`
- Provides sensible defaults
- Watches for file changes to hot-reload
- Exposes typed getters for each settings category

This is the foundation - other services will depend on this.

## Required Reading (READ THESE FIRST)
Before writing any code, read these files to understand existing patterns:

1. `src/services/ai-memory.js` - Similar service pattern, see how it loads JSON and exports functions
2. `src/services/gemini.js` - Another service example, note the singleton export pattern
3. `data/ai-memory.json` - Example data file structure
4. `CLAUDE.md` - Lines about Danny's profile for default values (search "Danny's Profile")

## Goal
Create `src/services/settings.js` that manages user settings with:
- Default settings matching Danny's ADHD profile
- Load/save functions with validation
- File watcher for live updates
- Category-specific getter functions

## Implementation Requirements

### Default Settings Structure
```javascript
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
```

### Required Functions
1. `loadSettings()` - Load from file or return defaults
2. `saveSettings(settings)` - Validate and save to file
3. `getSettings()` - Return current settings (cached)
4. `getScheduleSettings()` - Return schedule section
5. `getTaskSettings()` - Return tasks section
6. `getRulesSettings()` - Return rules section
7. `getRoutines()` - Return routines array
8. `getDisplaySettings()` - Return display section
9. `resetToDefaults()` - Reset all settings to defaults
10. `updateCategory(category, updates)` - Partial update

### Validation Rules
- Times must be valid HH:MM format
- Numbers must be positive
- workDays must be valid day names
- theme must be "light", "dark", or "system"

## Patterns to Follow
From `ai-memory.js`:
- Use singleton class pattern
- Export instance at bottom: `module.exports = new SettingsService();`
- Use `chokidar` for file watching (already in package.json)
- Log operations: `console.log('[Settings] ...')`

## Acceptance Criteria
- [ ] File `src/services/settings.js` exists
- [ ] Exports singleton instance
- [ ] Creates `data/settings.json` with defaults if missing
- [ ] All getter functions return correct sections
- [ ] `saveSettings()` validates before writing
- [ ] File watcher reloads on external changes
- [ ] Invalid settings throw descriptive errors

## Self-Verification
After implementation, run these commands:

```bash
# 1. Check file exists and has no syntax errors
node -e "const s = require('./src/services/settings.js'); console.log('Loaded:', s.getSettings().version)"

# 2. Test defaults creation (backup existing first)
mv data/settings.json data/settings.json.bak 2>/dev/null
node -e "const s = require('./src/services/settings.js'); console.log(JSON.stringify(s.getSettings(), null, 2))"
# Should print default settings

# 3. Test save/load cycle
node -e "
const s = require('./src/services/settings.js');
s.updateCategory('schedule', { workHours: { start: '08:00', end: '16:00' }});
const loaded = s.getScheduleSettings();
console.log('Updated work hours:', loaded.workHours);
"

# 4. Restore backup
mv data/settings.json.bak data/settings.json 2>/dev/null
```

## Error Recovery
If verification fails:
1. Check console for error messages
2. Verify `data/` directory exists and is writable
3. Check JSON syntax in settings.json if it exists
4. Review validation logic for edge cases
5. Compare with ai-memory.js patterns

## Do NOT
- Do NOT use environment variables for user settings
- Do NOT store settings in memory only (must persist to file)
- Do NOT skip validation
- Do NOT use synchronous file operations in the watcher callback
- Do NOT forget to handle the case where data/settings.json doesn't exist
```

---

## Step 1.2: Create Settings API Endpoints

### Prompt

```
You are an expert Express.js developer adding REST API endpoints for user settings.

## Context
Step 1.1 created `src/services/settings.js`. Now we need HTTP endpoints so the frontend can read and update settings. The server uses Express and WebSocket for real-time updates.

## Required Reading (READ THESE FIRST)
1. `src/server.js` - Understand existing API patterns, especially:
   - Lines 1-50: Imports and setup
   - Lines ~200-300: Example CRUD endpoints
   - WebSocket broadcast pattern (search "broadcast")
2. `src/services/settings.js` - The service you'll use (from Step 1.1)

## Goal
Add these endpoints to `src/server.js`:
- `GET /api/settings` - Get all settings
- `PUT /api/settings` - Replace all settings
- `PATCH /api/settings/:category` - Update one category
- `POST /api/settings/reset` - Reset to defaults

## Implementation Requirements

### Endpoint Specifications

```javascript
// GET /api/settings
// Returns: { success: true, settings: {...} }

// PUT /api/settings
// Body: Full settings object
// Returns: { success: true, settings: {...} }
// Errors: { success: false, error: "Validation message" }

// PATCH /api/settings/:category
// :category = schedule | tasks | rules | routines | display
// Body: Partial updates for that category
// Returns: { success: true, settings: {...} }

// POST /api/settings/reset
// Body: { confirm: true } (safety check)
// Returns: { success: true, settings: {...} }
```

### WebSocket Broadcast
After any successful update, broadcast to all clients:
```javascript
broadcast({ type: 'settings-updated', settings: updatedSettings });
```

### Error Handling
- 400 for validation errors with specific message
- 404 for invalid category
- 500 for file system errors

## Patterns to Follow
From existing server.js endpoints:
```javascript
// Follow this pattern for responses
app.get('/api/example', async (req, res) => {
    try {
        const data = someService.getData();
        res.json({ success: true, data });
    } catch (error) {
        console.error('[API] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});
```

## Acceptance Criteria
- [ ] All 4 endpoints exist and respond correctly
- [ ] GET returns current settings
- [ ] PUT validates and saves full settings
- [ ] PATCH only updates specified category
- [ ] Reset requires `confirm: true` in body
- [ ] WebSocket broadcasts on changes
- [ ] Proper error codes and messages

## Self-Verification
After implementation, restart server and run:

```bash
# Restart server
npx pm2 restart brain-server && sleep 3

# 1. Test GET
curl -s http://localhost:3001/api/settings | jq '.success, .settings.version'
# Expected: true, "1.0"

# 2. Test PATCH
curl -s -X PATCH http://localhost:3001/api/settings/schedule \
  -H "Content-Type: application/json" \
  -d '{"workHours": {"start": "08:30", "end": "16:30"}}' | jq '.success'
# Expected: true

# 3. Verify change persisted
curl -s http://localhost:3001/api/settings | jq '.settings.schedule.workHours'
# Expected: {"start": "08:30", "end": "16:30"}

# 4. Test invalid category
curl -s -X PATCH http://localhost:3001/api/settings/invalid \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.success, .error'
# Expected: false, "Invalid category..."

# 5. Test reset without confirm
curl -s -X POST http://localhost:3001/api/settings/reset \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.success'
# Expected: false

# 6. Test reset with confirm
curl -s -X POST http://localhost:3001/api/settings/reset \
  -H "Content-Type: application/json" \
  -d '{"confirm": true}' | jq '.success'
# Expected: true
```

## Error Recovery
If tests fail:
1. Check server logs: `npx pm2 logs brain-server --lines 20`
2. Verify settings service is imported at top of server.js
3. Check endpoint paths match exactly
4. Verify JSON parsing middleware is enabled
5. Test settings service directly in Node REPL

## Do NOT
- Do NOT forget to import settings service at top of server.js
- Do NOT allow reset without confirmation
- Do NOT skip WebSocket broadcast on updates
- Do NOT return raw errors (sanitize for client)
- Do NOT add authentication yet (future enhancement)
```

---

## Step 1.3: Integrate Settings with Existing Services

### Prompt

```
You are refactoring an Express app to use a centralized settings service instead of hardcoded values.

## Context
We have a working settings service and API. Now we need to replace hardcoded values in:
- `src/services/ai-memory.js` - Uses hardcoded userPreferences
- `src/prompts/schedule-reprioritize.js` - Has hardcoded times in prompt
- `src/server.js` - Has hardcoded task limits

This makes the AI scheduler respect user-configured preferences.

## Required Reading (READ THESE FIRST)
1. `src/services/settings.js` - The settings service
2. `src/services/ai-memory.js` - Find `userPreferences` object (around line 20-40)
3. `src/prompts/schedule-reprioritize.js` - Find hardcoded times like "9am-12pm"
4. `src/server.js` - Search for:
   - `MAX_TASKS_FOR_AI` (around line 1095)
   - `maxTasks = energyLevel ===` (around line 1183)
   - `endOfWorkday = 17` (in createFallbackResponse)

## Goal
Replace all hardcoded scheduling values with settings service calls.

## Implementation Requirements

### In ai-memory.js
Replace hardcoded `userPreferences` with settings:
```javascript
const settingsService = require('./settings');

// Replace this:
// userPreferences: { peakFocusHours: { start: "09:00", end: "12:00" }, ... }

// With dynamic getter:
getUserPreferences() {
    const schedule = settingsService.getScheduleSettings();
    const tasks = settingsService.getTaskSettings();
    return {
        peakFocusHours: schedule.peakFocusWindow,
        adminHours: { start: schedule.lowEnergyPeriod.start, end: schedule.workHours.end },
        maxDailyWorkMinutes: tasks.maxDailyMinutes,
        defaultBufferMinutes: tasks.bufferMinutes,
        defaultTaskDuration: tasks.defaultDuration,
        medicationKickInTime: schedule.medicationKickIn,
        energyDipTime: schedule.lowEnergyPeriod
    };
}
```

### In schedule-reprioritize.js
Replace hardcoded strings with settings values:
```javascript
const settingsService = require('../services/settings');

function buildReprioritizePrompt(context) {
    const scheduleSettings = settingsService.getScheduleSettings();
    const taskSettings = settingsService.getTaskSettings();

    // Use scheduleSettings.peakFocusWindow instead of hardcoded "9am-12pm"
    // Use scheduleSettings.lowEnergyPeriod instead of hardcoded "2pm-5pm"
    // etc.
}
```

### In server.js
Replace hardcoded limits:
```javascript
const settingsService = require('./services/settings');

// Replace: const MAX_TASKS_FOR_AI = 15;
// With: const getMaxTasksForAI = () => 15; // Keep as constant for now, or make configurable

// Replace in createFallbackResponse:
// const maxTasks = energyLevel === 'low' ? 2 : energyLevel === 'medium' ? 4 : 6;
// With:
const taskSettings = settingsService.getTaskSettings();
const maxTasks = taskSettings.maxTasksByEnergy[energyLevel] || 4;

// Replace: const endOfWorkday = 17;
// With:
const scheduleSettings = settingsService.getScheduleSettings();
const endOfWorkday = parseInt(scheduleSettings.workHours.end.split(':')[0]);
```

## Patterns to Follow
- Import settings service at top of file
- Call getters when needed (not at module load time for dynamic updates)
- Keep backward compatibility - same output format

## Acceptance Criteria
- [ ] ai-memory.js uses settings for all user preferences
- [ ] schedule-reprioritize.js prompt includes actual user settings
- [ ] server.js task limits come from settings
- [ ] Changing settings affects next AI scheduling call
- [ ] No hardcoded time values remain (search for "09:00", "17:00", etc.)
- [ ] Existing tests still pass

## Self-Verification
```bash
# 1. Verify no hardcoded times remain
grep -r "09:00\|17:00\|9am-12pm\|2pm-5pm" src/ --include="*.js" | grep -v settings.js | grep -v node_modules
# Should return empty or only comments

# 2. Test settings affect AI memory
curl -s http://localhost:3001/api/ai-memory/claude-context | jq '.preferences'
# Should show values from settings.json

# 3. Change settings and verify
curl -s -X PATCH http://localhost:3001/api/settings/schedule \
  -H "Content-Type: application/json" \
  -d '{"peakFocusWindow": {"start": "10:00", "end": "13:00"}}'

curl -s http://localhost:3001/api/ai-memory/claude-context | jq '.preferences.peakFocusHours'
# Should show {"start": "10:00", "end": "13:00"}

# 4. Test AI reprioritize uses new settings
curl -s -X POST http://localhost:3001/api/schedule/reprioritize \
  -H "Content-Type: application/json" \
  -d '{"tasks":[{"id":"t1","title":"Test","priority":5,"projectName":"Work","estimatedMinutes":30}],"energyLevel":"medium"}' | jq '.thinking'
# Response should reference the new focus window times

# 5. Run existing tests
npm test
```

## Error Recovery
If verification fails:
1. Check for circular dependencies (settings importing something that imports settings)
2. Verify settings service is a singleton (same instance everywhere)
3. Check import paths are correct (relative vs absolute)
4. Look for caching that might hold old values

## Do NOT
- Do NOT import settings at module level if the getter needs fresh values
- Do NOT break existing function signatures
- Do NOT remove any existing functionality
- Do NOT change the AI prompt structure, just the values
```

---

## Step 2.1: Create Settings Page HTML

### Prompt

```
You are a frontend developer creating a settings page for an ADHD task management web app.

## Context
We have a working settings API. Now we need a user-friendly settings page that matches the existing UI style. The app uses vanilla JavaScript (no frameworks) and has existing pages as references.

## Required Reading (READ THESE FIRST)
1. `public/index.html` - Main page structure, navigation, styling classes
2. `public/schedule.html` - Another content page, similar structure needed
3. `public/projects.html` - Form patterns and modals
4. `public/styles.css` - Existing CSS classes and variables
5. `public/guide.html` - Documentation page structure

## Goal
Create `public/settings.html` with:
- Navigation matching other pages
- Sidebar with category tabs
- Form sections for each settings category
- Consistent styling with existing pages

## Implementation Requirements

### Page Structure
```html
<!-- Follow index.html structure -->
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Same meta tags, title: "Settings - Executive Brain" -->
    <!-- Same CSS link -->
</head>
<body>
    <!-- Same navigation as index.html but Settings tab active -->

    <main class="settings-container">
        <header>
            <h1>Settings</h1>
        </header>

        <div class="settings-layout">
            <!-- Sidebar with category tabs -->
            <nav class="settings-sidebar">
                <button class="settings-tab active" data-category="schedule">
                    Schedule
                </button>
                <button class="settings-tab" data-category="tasks">
                    Tasks
                </button>
                <button class="settings-tab" data-category="rules">
                    Rules
                </button>
                <button class="settings-tab" data-category="routines">
                    Routines
                </button>
                <button class="settings-tab" data-category="display">
                    Display
                </button>
            </nav>

            <!-- Content area -->
            <div class="settings-content">
                <!-- Schedule Section -->
                <section id="schedule-settings" class="settings-section active">
                    <!-- Form fields -->
                </section>

                <!-- Tasks Section -->
                <section id="tasks-settings" class="settings-section">
                    <!-- Form fields -->
                </section>

                <!-- ... other sections ... -->
            </div>
        </div>

        <!-- Action buttons -->
        <div class="settings-actions">
            <button id="save-settings" class="btn-primary">Save Changes</button>
            <button id="reset-settings" class="btn-secondary">Reset to Defaults</button>
        </div>
    </main>

    <!-- Toast notification container -->
    <div id="toast-container"></div>

    <script src="settings.js"></script>
</body>
</html>
```

### Form Fields by Section

**Schedule Section:**
- Work Days: Checkboxes for each day (Mon-Sun)
- Work Hours: Two time inputs (start, end)
- Peak Focus Window: Two time inputs
- Low Energy Period: Two time inputs
- Medication Time: Time input
- Medication Kick-in: Time input

**Tasks Section:**
- Default Duration: Number input (minutes)
- Buffer Between Tasks: Number input (minutes)
- Max Daily Work Time: Number input (minutes, show as hours)
- Preferred Task Size: Range slider or two inputs (min, max)
- Max Tasks by Energy: Three number inputs (low, medium, high)

**Rules Section:**
- Deep Focus Morning Only: Toggle/checkbox
- Meeting Preference: Select (morning, afternoon, any)
- Auto-reschedule Low Priority: Toggle/checkbox
- Break Reminder: Number input (minutes)

**Routines Section:**
- List of routines with edit/delete buttons
- "Add Routine" button
- (Modal for add/edit - can be basic for now)

**Display Section:**
- Theme: Select (light, dark, system)
- Default View: Select (chat, schedule, projects)
- Show Completed Tasks: Toggle/checkbox

### CSS Classes to Add (in styles.css)
```css
/* Settings page layout */
.settings-container { }
.settings-layout { display: flex; gap: 2rem; }
.settings-sidebar { }
.settings-tab { }
.settings-tab.active { }
.settings-content { flex: 1; }
.settings-section { display: none; }
.settings-section.active { display: block; }
.settings-actions { }

/* Form styling */
.form-group { margin-bottom: 1rem; }
.form-group label { }
.form-group input, .form-group select { }
.form-row { display: flex; gap: 1rem; }
.day-selector { display: flex; gap: 0.5rem; }
.day-checkbox { }

/* Toast notifications */
#toast-container { }
.toast { }
.toast.success { }
.toast.error { }
```

### Update Navigation on ALL Pages
Add Settings tab to navigation in:
- index.html
- schedule.html
- projects.html
- guide.html

```html
<nav class="sidebar">
    <a href="/" class="nav-item">Chat</a>
    <a href="/schedule.html" class="nav-item">Schedule</a>
    <a href="/projects.html" class="nav-item">Projects</a>
    <a href="/settings.html" class="nav-item active">Settings</a>
    <a href="/guide.html" class="nav-item">Guide</a>
</nav>
```

## Patterns to Follow
- Use existing CSS variables (--primary-color, etc.)
- Follow existing form patterns from projects.html
- Match button styling from index.html
- Use semantic HTML

## Acceptance Criteria
- [ ] settings.html exists and is served at /settings.html
- [ ] Navigation appears on all pages with Settings tab
- [ ] All 5 category sections exist with appropriate form fields
- [ ] Sidebar tabs switch between sections
- [ ] Save and Reset buttons are visible
- [ ] Page is responsive (works on mobile)
- [ ] Styling matches existing pages

## Self-Verification
```bash
# 1. Check file exists
ls -la public/settings.html

# 2. Check navigation updated on all pages
grep -l "settings.html" public/*.html
# Should list: index.html, schedule.html, projects.html, guide.html, settings.html

# 3. Start server and check in browser
npx pm2 restart brain-server
# Open http://localhost:3001/settings.html
# Manually verify:
# - Page loads without errors
# - Navigation works
# - All tabs show content
# - Forms are visible
# - Mobile responsive (resize window)
```

## Error Recovery
If page doesn't load:
1. Check browser console for errors
2. Verify HTML syntax (no unclosed tags)
3. Check CSS file is linked correctly
4. Verify JavaScript file path

## Do NOT
- Do NOT use any JavaScript frameworks
- Do NOT create a separate CSS file (add to styles.css)
- Do NOT skip mobile responsiveness
- Do NOT forget to update navigation on other pages
- Do NOT use inline styles
```

---

## Step 2.2: Implement Settings JavaScript

### Prompt

```
You are implementing the JavaScript for a settings page that loads, displays, and saves user preferences.

## Context
Step 2.1 created `settings.html`. Now we need JavaScript to:
- Load settings from API on page load
- Populate form fields with current values
- Handle tab switching
- Save changes to API
- Show success/error notifications
- Sync across tabs via WebSocket

## Required Reading (READ THESE FIRST)
1. `public/settings.html` - The HTML structure to interact with
2. `public/app.js` - Existing patterns for API calls, WebSocket, notifications
3. `src/server.js` - API endpoints available (GET/PUT/PATCH /api/settings)

## Goal
Create `public/settings.js` that manages all settings page interactivity.

## Implementation Requirements

### Core Functions

```javascript
// State
let currentSettings = null;
let unsavedChanges = false;

// Initialize on page load
async function initSettings() {
    await loadSettings();
    populateForms();
    setupEventListeners();
    setupWebSocket();
}

// Load settings from API
async function loadSettings() {
    const response = await fetch('/api/settings');
    const data = await response.json();
    if (data.success) {
        currentSettings = data.settings;
    }
}

// Populate all form fields
function populateForms() {
    populateScheduleForm();
    populateTasksForm();
    populateRulesForm();
    populateRoutinesForm();
    populateDisplayForm();
}

// Tab switching
function switchTab(category) {
    // Update sidebar active state
    // Show/hide sections
}

// Collect form data for a category
function collectCategoryData(category) {
    // Read form inputs
    // Return structured object matching settings schema
}

// Save changes
async function saveSettings() {
    // Collect all changed categories
    // PATCH each changed category
    // Show success/error toast
    // Reset unsavedChanges flag
}

// Reset to defaults
async function resetSettings() {
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) {
        return;
    }
    // POST /api/settings/reset with confirm: true
    // Reload settings
    // Repopulate forms
}

// Toast notifications
function showToast(message, type = 'success') {
    // Create toast element
    // Add to container
    // Auto-remove after 3 seconds
}

// WebSocket for cross-tab sync
function setupWebSocket() {
    // Connect to existing WebSocket
    // Listen for 'settings-updated' events
    // Reload and repopulate if settings changed externally
}

// Track unsaved changes
function markUnsaved() {
    unsavedChanges = true;
    // Update save button style
}

// Warn before leaving with unsaved changes
window.addEventListener('beforeunload', (e) => {
    if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
});
```

### Form Population Examples

```javascript
function populateScheduleForm() {
    const schedule = currentSettings.schedule;

    // Work days checkboxes
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach(day => {
        const checkbox = document.getElementById(`workday-${day}`);
        if (checkbox) {
            checkbox.checked = schedule.workDays.includes(day);
        }
    });

    // Time inputs
    document.getElementById('work-start').value = schedule.workHours.start;
    document.getElementById('work-end').value = schedule.workHours.end;
    document.getElementById('focus-start').value = schedule.peakFocusWindow.start;
    document.getElementById('focus-end').value = schedule.peakFocusWindow.end;
    // ... etc
}

function collectScheduleData() {
    const workDays = [];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach(day => {
        const checkbox = document.getElementById(`workday-${day}`);
        if (checkbox && checkbox.checked) {
            workDays.push(day);
        }
    });

    return {
        workDays,
        workHours: {
            start: document.getElementById('work-start').value,
            end: document.getElementById('work-end').value
        },
        peakFocusWindow: {
            start: document.getElementById('focus-start').value,
            end: document.getElementById('focus-end').value
        },
        // ... etc
    };
}
```

### Event Listeners

```javascript
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.category));
    });

    // Save button
    document.getElementById('save-settings').addEventListener('click', saveSettings);

    // Reset button
    document.getElementById('reset-settings').addEventListener('click', resetSettings);

    // Track changes on all inputs
    document.querySelectorAll('.settings-section input, .settings-section select').forEach(input => {
        input.addEventListener('change', markUnsaved);
    });
}
```

## Patterns to Follow
From app.js:
- Use fetch for API calls
- Handle errors gracefully
- Use existing WebSocket connection if available

## Acceptance Criteria
- [ ] Settings load on page open
- [ ] All form fields show current values
- [ ] Tab switching works
- [ ] Changes are tracked (unsaved indicator)
- [ ] Save button sends PATCH requests
- [ ] Success/error toasts appear
- [ ] Reset confirms before resetting
- [ ] WebSocket updates refresh forms
- [ ] Unsaved changes warning on page leave

## Self-Verification
```bash
# 1. Restart server and open settings page
npx pm2 restart brain-server
# Open http://localhost:3001/settings.html

# Manual testing checklist:
# [ ] Page loads without console errors
# [ ] All fields show current values
# [ ] Click each tab - content switches
# [ ] Change a value - see unsaved indicator
# [ ] Click Save - see success toast
# [ ] Refresh page - change persisted
# [ ] Open in two tabs - change in one, other updates
# [ ] Click Reset - confirm dialog appears
# [ ] After reset - all fields show defaults
# [ ] Try to leave with unsaved changes - warning appears
```

## Error Recovery
If something doesn't work:
1. Check browser console for JavaScript errors
2. Check Network tab for failed API calls
3. Verify element IDs match between HTML and JS
4. Check WebSocket connection status
5. Test API endpoints directly with curl

## Do NOT
- Do NOT use jQuery or other libraries
- Do NOT save on every keystroke (only on Save button)
- Do NOT allow saving invalid data
- Do NOT forget error handling for API calls
- Do NOT block the UI during save operations
```

---

## Step 2.3: Implement Routines Management UI

### Prompt

```
You are implementing a CRUD interface for managing recurring routines/events.

## Context
The settings page has a Routines section that needs special handling - it's not just form fields but a list with add/edit/delete capabilities. Routines are stored in settings.routines array.

## Required Reading (READ THESE FIRST)
1. `public/settings.html` - Routines section structure
2. `public/settings.js` - Existing settings JavaScript
3. `public/projects.html` - Modal patterns for add/edit forms
4. Settings schema for routines:
```json
{
  "id": "unique-id",
  "name": "Routine Name",
  "time": "09:00",
  "duration": 30,
  "days": ["monday", "tuesday", ...],
  "enabled": true
}
```

## Goal
Add routines management to the settings page:
- Display list of routines as cards
- Add new routine via modal
- Edit existing routine via modal
- Delete with confirmation
- Toggle enabled/disabled

## Implementation Requirements

### HTML Structure (add to settings.html routines section)
```html
<section id="routines-settings" class="settings-section">
    <div class="routines-header">
        <h2>Routines</h2>
        <button id="add-routine" class="btn-primary">+ Add Routine</button>
    </div>

    <div id="routines-list" class="routines-list">
        <!-- Routine cards rendered by JavaScript -->
    </div>
</section>

<!-- Routine Modal (add before </body>) -->
<div id="routine-modal" class="modal hidden">
    <div class="modal-content">
        <h3 id="routine-modal-title">Add Routine</h3>
        <form id="routine-form">
            <div class="form-group">
                <label for="routine-name">Name</label>
                <input type="text" id="routine-name" required>
            </div>
            <div class="form-group">
                <label for="routine-time">Time</label>
                <input type="time" id="routine-time" required>
            </div>
            <div class="form-group">
                <label for="routine-duration">Duration (minutes)</label>
                <input type="number" id="routine-duration" min="5" max="480" value="30">
            </div>
            <div class="form-group">
                <label>Days</label>
                <div class="day-selector">
                    <label><input type="checkbox" name="routine-day" value="monday"> Mon</label>
                    <label><input type="checkbox" name="routine-day" value="tuesday"> Tue</label>
                    <label><input type="checkbox" name="routine-day" value="wednesday"> Wed</label>
                    <label><input type="checkbox" name="routine-day" value="thursday"> Thu</label>
                    <label><input type="checkbox" name="routine-day" value="friday"> Fri</label>
                    <label><input type="checkbox" name="routine-day" value="saturday"> Sat</label>
                    <label><input type="checkbox" name="routine-day" value="sunday"> Sun</label>
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" id="cancel-routine" class="btn-secondary">Cancel</button>
                <button type="submit" class="btn-primary">Save</button>
            </div>
        </form>
    </div>
</div>
```

### JavaScript Functions (add to settings.js)

```javascript
let editingRoutineId = null;

function renderRoutines() {
    const container = document.getElementById('routines-list');
    const routines = currentSettings.routines || [];

    if (routines.length === 0) {
        container.innerHTML = '<p class="empty-state">No routines yet. Add one to get started!</p>';
        return;
    }

    container.innerHTML = routines.map(routine => `
        <div class="routine-card ${routine.enabled ? '' : 'disabled'}" data-id="${routine.id}">
            <div class="routine-info">
                <h4>${routine.name}</h4>
                <p>${routine.time} · ${routine.duration} min · ${formatDays(routine.days)}</p>
            </div>
            <div class="routine-actions">
                <label class="toggle">
                    <input type="checkbox" ${routine.enabled ? 'checked' : ''}
                           onchange="toggleRoutine('${routine.id}')">
                    <span class="toggle-slider"></span>
                </label>
                <button onclick="editRoutine('${routine.id}')" class="btn-icon" title="Edit">✏️</button>
                <button onclick="deleteRoutine('${routine.id}')" class="btn-icon" title="Delete">🗑️</button>
            </div>
        </div>
    `).join('');
}

function formatDays(days) {
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && !days.includes('saturday') && !days.includes('sunday')) {
        return 'Weekdays';
    }
    return days.map(d => d.slice(0, 3)).join(', ');
}

function openRoutineModal(routine = null) {
    editingRoutineId = routine?.id || null;

    document.getElementById('routine-modal-title').textContent =
        routine ? 'Edit Routine' : 'Add Routine';

    // Populate or clear form
    document.getElementById('routine-name').value = routine?.name || '';
    document.getElementById('routine-time').value = routine?.time || '09:00';
    document.getElementById('routine-duration').value = routine?.duration || 30;

    // Set day checkboxes
    document.querySelectorAll('input[name="routine-day"]').forEach(cb => {
        cb.checked = routine?.days?.includes(cb.value) || false;
    });

    document.getElementById('routine-modal').classList.remove('hidden');
}

function closeRoutineModal() {
    document.getElementById('routine-modal').classList.add('hidden');
    editingRoutineId = null;
}

async function saveRoutine(e) {
    e.preventDefault();

    const days = Array.from(document.querySelectorAll('input[name="routine-day"]:checked'))
        .map(cb => cb.value);

    if (days.length === 0) {
        showToast('Please select at least one day', 'error');
        return;
    }

    const routine = {
        id: editingRoutineId || `routine-${Date.now()}`,
        name: document.getElementById('routine-name').value,
        time: document.getElementById('routine-time').value,
        duration: parseInt(document.getElementById('routine-duration').value),
        days,
        enabled: true
    };

    // Update routines array
    const routines = [...(currentSettings.routines || [])];
    if (editingRoutineId) {
        const index = routines.findIndex(r => r.id === editingRoutineId);
        if (index >= 0) {
            routine.enabled = routines[index].enabled; // Preserve enabled state
            routines[index] = routine;
        }
    } else {
        routines.push(routine);
    }

    // Save to API
    try {
        const response = await fetch('/api/settings/routines', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(routines)
        });

        if (response.ok) {
            currentSettings.routines = routines;
            renderRoutines();
            closeRoutineModal();
            showToast(editingRoutineId ? 'Routine updated' : 'Routine added');
        } else {
            throw new Error('Failed to save');
        }
    } catch (error) {
        showToast('Failed to save routine', 'error');
    }
}

function editRoutine(id) {
    const routine = currentSettings.routines.find(r => r.id === id);
    if (routine) {
        openRoutineModal(routine);
    }
}

async function deleteRoutine(id) {
    const routine = currentSettings.routines.find(r => r.id === id);
    if (!routine) return;

    if (!confirm(`Delete "${routine.name}"?`)) return;

    const routines = currentSettings.routines.filter(r => r.id !== id);

    try {
        const response = await fetch('/api/settings/routines', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(routines)
        });

        if (response.ok) {
            currentSettings.routines = routines;
            renderRoutines();
            showToast('Routine deleted');
        }
    } catch (error) {
        showToast('Failed to delete routine', 'error');
    }
}

async function toggleRoutine(id) {
    const routines = currentSettings.routines.map(r =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
    );

    try {
        await fetch('/api/settings/routines', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(routines)
        });
        currentSettings.routines = routines;
        renderRoutines();
    } catch (error) {
        showToast('Failed to update routine', 'error');
    }
}

// Add to setupEventListeners()
document.getElementById('add-routine').addEventListener('click', () => openRoutineModal());
document.getElementById('cancel-routine').addEventListener('click', closeRoutineModal);
document.getElementById('routine-form').addEventListener('submit', saveRoutine);

// Add to populateForms()
renderRoutines();
```

### CSS (add to styles.css)
```css
.routines-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.routines-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.routine-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--card-bg);
    border-radius: 8px;
    border: 1px solid var(--border-color);
}

.routine-card.disabled {
    opacity: 0.6;
}

.routine-info h4 {
    margin: 0 0 0.25rem 0;
}

.routine-info p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.routine-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.btn-icon {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    font-size: 1rem;
}

/* Modal styles */
.modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal.hidden {
    display: none;
}

.modal-content {
    background: var(--bg-color);
    padding: 1.5rem;
    border-radius: 12px;
    width: 90%;
    max-width: 400px;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1.5rem;
}

/* Toggle switch */
.toggle {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
}

.toggle input {
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background-color: var(--border-color);
    border-radius: 24px;
    transition: 0.2s;
}

.toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    border-radius: 50%;
    transition: 0.2s;
}

.toggle input:checked + .toggle-slider {
    background-color: var(--primary-color);
}

.toggle input:checked + .toggle-slider:before {
    transform: translateX(20px);
}
```

## Acceptance Criteria
- [ ] Routines section shows list of current routines
- [ ] Each routine shows name, time, duration, days, enabled toggle
- [ ] "Add Routine" opens modal with empty form
- [ ] Edit button opens modal with pre-filled form
- [ ] Delete confirms before removing
- [ ] Days selector allows multi-select
- [ ] Toggle enables/disables routine
- [ ] Changes persist to API

## Self-Verification
```
Manual testing checklist:
[ ] View existing routines (or empty state)
[ ] Add new routine - fill all fields, save
[ ] New routine appears in list
[ ] Edit routine - changes persist
[ ] Delete routine - confirms and removes
[ ] Toggle enabled - visual change and persists
[ ] Create routine for weekdays only - shows "Weekdays"
[ ] Refresh page - all routines still there
```

## Error Recovery
If routines don't save:
1. Check browser console for errors
2. Verify API endpoint handles routines category
3. Check network tab for request/response
4. Test API directly with curl

## Do NOT
- Do NOT allow routines without days selected
- Do NOT forget to escape user input in HTML
- Do NOT skip the delete confirmation
- Do NOT forget to handle empty routines array
```

---

## Step 3.1: Fix and Enhance Theme System

### Prompt

```
You are fixing a broken theme toggle and integrating it with the settings system.

## Context
The app has a theme toggle but it's noted as broken. We need to:
1. Fix the existing theme toggle
2. Store theme preference in settings
3. Apply theme before page render (no flash)
4. Add "system" option that follows OS preference

## Required Reading (READ THESE FIRST)
1. `public/styles.css` - Look for :root CSS variables, dark mode styles
2. `public/app.js` - Look for existing theme toggle code
3. `public/index.html` - Theme toggle button location
4. `public/settings.js` - Display settings section

## Goal
- Theme toggle works on all pages
- Theme persists via settings API
- System preference option works
- No flash of wrong theme on page load

## Implementation Requirements

### CSS Variables (in styles.css)
```css
:root {
    /* Light theme (default) */
    --bg-color: #ffffff;
    --text-color: #1a1a1a;
    --text-secondary: #666666;
    --card-bg: #f5f5f5;
    --border-color: #e0e0e0;
    --primary-color: #4f46e5;
    --primary-hover: #4338ca;
    --danger-color: #dc2626;
    --success-color: #16a34a;
}

[data-theme="dark"] {
    --bg-color: #1a1a1a;
    --text-color: #f5f5f5;
    --text-secondary: #a0a0a0;
    --card-bg: #2a2a2a;
    --border-color: #404040;
    --primary-color: #6366f1;
    --primary-hover: #818cf8;
}

/* Ensure all elements use variables */
body {
    background-color: var(--bg-color);
    color: var(--text-color);
}
```

### Theme JavaScript (create public/theme.js)
```javascript
// Theme management - load early to prevent flash
(function() {
    // Get saved theme or default to system
    function getSavedTheme() {
        // Try localStorage first (faster than API)
        const cached = localStorage.getItem('theme');
        if (cached) return cached;
        return 'system';
    }

    function getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function applyTheme(theme) {
        const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
        document.documentElement.setAttribute('data-theme', effectiveTheme);

        // Update toggle button icon if exists
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            toggle.textContent = effectiveTheme === 'dark' ? '☀️' : '🌙';
        }
    }

    // Apply immediately (before DOM loads)
    applyTheme(getSavedTheme());

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (getSavedTheme() === 'system') {
            applyTheme('system');
        }
    });

    // Expose globally
    window.themeManager = {
        get: getSavedTheme,
        set: async function(theme) {
            localStorage.setItem('theme', theme);
            applyTheme(theme);

            // Also save to settings API
            try {
                await fetch('/api/settings/display', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ theme })
                });
            } catch (e) {
                console.warn('Failed to save theme to settings');
            }
        },
        toggle: function() {
            const current = getSavedTheme();
            const next = current === 'dark' ? 'light' :
                        current === 'light' ? 'system' : 'dark';
            this.set(next);
        }
    };
})();
```

### Include theme.js FIRST in all HTML pages
```html
<head>
    <!-- Load theme script first to prevent flash -->
    <script src="theme.js"></script>
    <!-- Then other resources -->
    <link rel="stylesheet" href="styles.css">
</head>
```

### Theme toggle button handler (in app.js or inline)
```javascript
document.getElementById('theme-toggle')?.addEventListener('click', () => {
    window.themeManager.toggle();
});
```

### Settings page theme selector
In settings.html display section:
```html
<div class="form-group">
    <label for="theme-select">Theme</label>
    <select id="theme-select">
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System (follow OS)</option>
    </select>
</div>
```

In settings.js:
```javascript
function populateDisplayForm() {
    const display = currentSettings.display;
    document.getElementById('theme-select').value = display.theme;
    // Sync with theme manager
    if (window.themeManager) {
        window.themeManager.set(display.theme);
    }
}

// On theme select change
document.getElementById('theme-select').addEventListener('change', (e) => {
    if (window.themeManager) {
        window.themeManager.set(e.target.value);
    }
    markUnsaved();
});
```

### Sync theme from settings on page load
Add to theme.js or settings load:
```javascript
// After settings load, sync theme
async function syncThemeFromSettings() {
    try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        if (data.success && data.settings.display?.theme) {
            const serverTheme = data.settings.display.theme;
            const localTheme = localStorage.getItem('theme');
            if (serverTheme !== localTheme) {
                localStorage.setItem('theme', serverTheme);
                applyTheme(serverTheme);
            }
        }
    } catch (e) {
        // Use local/default on error
    }
}
```

## Acceptance Criteria
- [ ] Theme toggle works on all pages
- [ ] Theme persists across page refreshes
- [ ] "System" option follows OS dark mode
- [ ] No flash of wrong theme on page load
- [ ] Theme syncs across browser tabs
- [ ] Settings page theme selector works
- [ ] All UI elements respect theme

## Self-Verification
```bash
# 1. Add theme.js to all HTML pages
grep -l "theme.js" public/*.html
# Should list all pages

# Manual testing:
# [ ] Open page - no flash of wrong theme
# [ ] Toggle theme button - changes immediately
# [ ] Refresh - theme persists
# [ ] Change OS dark mode (if on system) - page updates
# [ ] Open settings, change theme - works
# [ ] Open two tabs - theme syncs

# Check CSS variables are used
grep -c "var(--" public/styles.css
# Should be many occurrences
```

## Error Recovery
If theme doesn't work:
1. Check theme.js loads before styles.css
2. Verify [data-theme] attribute on html element
3. Check CSS variables are defined for both themes
4. Test localStorage in browser console

## Do NOT
- Do NOT load theme.js after CSS (causes flash)
- Do NOT hardcode colors (use CSS variables)
- Do NOT forget system preference listener
- Do NOT skip localStorage (API might be slow)
```

---

## Step 4.1: Create Comprehensive Tests

### Prompt

```
You are writing tests for the settings system to ensure reliability.

## Context
We've implemented:
- Settings service (src/services/settings.js)
- Settings API endpoints (src/server.js)
- Settings validation

Now we need comprehensive tests.

## Required Reading (READ THESE FIRST)
1. `tests/unit/ticktickSync.test.js` - Existing test patterns
2. `src/services/settings.js` - Service to test
3. `src/server.js` - API endpoints to test
4. `package.json` - Test configuration

## Goal
Create tests for:
- Settings service unit tests
- API endpoint integration tests
- Validation edge cases

## Implementation Requirements

### Create tests/unit/settings.test.js
```javascript
const fs = require('fs');
const path = require('path');

// Mock file system for isolated tests
jest.mock('fs');

describe('Settings Service', () => {
    let settingsService;
    const testSettingsPath = path.join(__dirname, '../../data/settings.json');

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        // Clear require cache to get fresh instance
        delete require.cache[require.resolve('../../src/services/settings')];
    });

    describe('loadSettings', () => {
        it('should return defaults when file does not exist', () => {
            fs.existsSync.mockReturnValue(false);
            fs.writeFileSync.mockImplementation(() => {});

            settingsService = require('../../src/services/settings');
            const settings = settingsService.getSettings();

            expect(settings.version).toBe('1.0');
            expect(settings.schedule.workDays).toContain('monday');
        });

        it('should load settings from file when exists', () => {
            const customSettings = {
                version: '1.0',
                schedule: { workDays: ['monday', 'wednesday', 'friday'] }
            };

            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(JSON.stringify(customSettings));

            settingsService = require('../../src/services/settings');
            const settings = settingsService.getSettings();

            expect(settings.schedule.workDays).toEqual(['monday', 'wednesday', 'friday']);
        });

        it('should handle corrupted JSON gracefully', () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue('not valid json');
            fs.writeFileSync.mockImplementation(() => {});

            settingsService = require('../../src/services/settings');
            const settings = settingsService.getSettings();

            // Should fall back to defaults
            expect(settings.version).toBe('1.0');
        });
    });

    describe('saveSettings', () => {
        it('should validate and save settings', () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0' }));
            fs.writeFileSync.mockImplementation(() => {});

            settingsService = require('../../src/services/settings');

            const newSettings = settingsService.getSettings();
            newSettings.schedule.workHours = { start: '08:00', end: '16:00' };

            settingsService.saveSettings(newSettings);

            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        it('should reject invalid time format', () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0' }));

            settingsService = require('../../src/services/settings');

            const newSettings = settingsService.getSettings();
            newSettings.schedule.workHours = { start: 'invalid', end: '16:00' };

            expect(() => settingsService.saveSettings(newSettings)).toThrow();
        });

        it('should reject negative numbers', () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0' }));

            settingsService = require('../../src/services/settings');

            const newSettings = settingsService.getSettings();
            newSettings.tasks.defaultDuration = -5;

            expect(() => settingsService.saveSettings(newSettings)).toThrow();
        });
    });

    describe('getters', () => {
        beforeEach(() => {
            fs.existsSync.mockReturnValue(false);
            fs.writeFileSync.mockImplementation(() => {});
            settingsService = require('../../src/services/settings');
        });

        it('getScheduleSettings returns schedule section', () => {
            const schedule = settingsService.getScheduleSettings();
            expect(schedule).toHaveProperty('workDays');
            expect(schedule).toHaveProperty('workHours');
        });

        it('getTaskSettings returns tasks section', () => {
            const tasks = settingsService.getTaskSettings();
            expect(tasks).toHaveProperty('defaultDuration');
            expect(tasks).toHaveProperty('bufferMinutes');
        });

        it('getRulesSettings returns rules section', () => {
            const rules = settingsService.getRulesSettings();
            expect(rules).toHaveProperty('deepFocusMorningOnly');
        });

        it('getRoutines returns routines array', () => {
            const routines = settingsService.getRoutines();
            expect(Array.isArray(routines)).toBe(true);
        });
    });

    describe('updateCategory', () => {
        beforeEach(() => {
            fs.existsSync.mockReturnValue(false);
            fs.writeFileSync.mockImplementation(() => {});
            settingsService = require('../../src/services/settings');
        });

        it('should update only specified category', () => {
            const originalTasks = settingsService.getTaskSettings().defaultDuration;

            settingsService.updateCategory('schedule', {
                workHours: { start: '07:00', end: '15:00' }
            });

            // Schedule should be updated
            expect(settingsService.getScheduleSettings().workHours.start).toBe('07:00');
            // Tasks should be unchanged
            expect(settingsService.getTaskSettings().defaultDuration).toBe(originalTasks);
        });

        it('should throw for invalid category', () => {
            expect(() => {
                settingsService.updateCategory('invalid', {});
            }).toThrow();
        });
    });
});
```

### Create tests/integration/settings-api.test.js
```javascript
const request = require('supertest');
const fs = require('fs');
const path = require('path');

describe('Settings API', () => {
    let app;
    const settingsPath = path.join(__dirname, '../../data/settings.json');
    let originalSettings;

    beforeAll(() => {
        // Backup original settings
        if (fs.existsSync(settingsPath)) {
            originalSettings = fs.readFileSync(settingsPath, 'utf8');
        }
        app = require('../../src/server');
    });

    afterAll(() => {
        // Restore original settings
        if (originalSettings) {
            fs.writeFileSync(settingsPath, originalSettings);
        }
    });

    describe('GET /api/settings', () => {
        it('should return current settings', async () => {
            const response = await request(app)
                .get('/api/settings')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.settings).toHaveProperty('version');
            expect(response.body.settings).toHaveProperty('schedule');
        });
    });

    describe('PATCH /api/settings/:category', () => {
        it('should update schedule category', async () => {
            const response = await request(app)
                .patch('/api/settings/schedule')
                .send({ workHours: { start: '10:00', end: '18:00' } })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.settings.schedule.workHours.start).toBe('10:00');
        });

        it('should reject invalid category', async () => {
            const response = await request(app)
                .patch('/api/settings/invalid')
                .send({ foo: 'bar' })
                .expect(404);

            expect(response.body.success).toBe(false);
        });

        it('should validate input data', async () => {
            const response = await request(app)
                .patch('/api/settings/tasks')
                .send({ defaultDuration: -10 })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/settings/reset', () => {
        it('should require confirmation', async () => {
            const response = await request(app)
                .post('/api/settings/reset')
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should reset with confirmation', async () => {
            const response = await request(app)
                .post('/api/settings/reset')
                .send({ confirm: true })
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });
});
```

## Acceptance Criteria
- [ ] Unit tests for settings service pass
- [ ] Integration tests for API pass
- [ ] Edge cases covered (invalid input, missing files)
- [ ] Tests are isolated (don't affect real settings)
- [ ] All tests can run with `npm test`

## Self-Verification
```bash
# Run all tests
npm test

# Run only settings tests
npm test -- --grep "Settings"

# Check coverage
npm test -- --coverage

# Expected output:
# All tests passing
# Good coverage (>80%) for settings service
```

## Error Recovery
If tests fail:
1. Check test isolation (mock cleanup)
2. Verify require cache is cleared between tests
3. Check file paths are correct
4. Ensure mocks match actual implementation

## Do NOT
- Do NOT test against real settings file
- Do NOT leave test data after tests
- Do NOT skip edge cases
- Do NOT write flaky tests
```

---

## Step 4.2: Update All Documentation

### Prompt

```
You are updating documentation to reflect the new settings system.

## Context
The settings system is implemented. Now we need to update all documentation to keep it accurate and helpful.

## Required Reading (READ THESE FIRST)
1. `docs/README.md` - Main documentation
2. `docs/HOW-IT-WORKS.md` - Technical documentation
3. `public/guide.html` - User-facing guide
4. `CLAUDE.md` - Instructions for Claude AI

## Goal
Update all documentation to include:
- Settings file structure
- Settings API endpoints
- How to configure preferences
- Settings page usage

## Implementation Requirements

### Update docs/README.md
Add to Files table:
```markdown
| `data/settings.json` | User preferences and configuration |
| `src/services/settings.js` | Settings management service |
| `public/settings.html` | Settings page UI |
```

Add Settings section:
```markdown
## Configuration

User preferences are stored in `data/settings.json`. You can configure:

- **Schedule**: Work days, hours, focus windows, medication timing
- **Tasks**: Default duration, buffers, daily limits
- **Rules**: Scheduling rules and preferences
- **Routines**: Recurring events and focus blocks
- **Display**: Theme, default view

Edit via the Settings page at http://localhost:3001/settings.html or directly edit the JSON file.
```

### Update docs/HOW-IT-WORKS.md
Add Settings Service section:
```markdown
## Settings Service

The settings service (`src/services/settings.js`) manages user preferences.

### Architecture
- Settings stored in `data/settings.json`
- Loaded on startup, cached in memory
- File watcher for live updates
- API endpoints for CRUD operations

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/settings | Get all settings |
| PUT | /api/settings | Replace all settings |
| PATCH | /api/settings/:category | Update one category |
| POST | /api/settings/reset | Reset to defaults |

### Integration
Other services use settings via:
\`\`\`javascript
const settings = require('./services/settings');
const schedule = settings.getScheduleSettings();
\`\`\`
```

### Update public/guide.html
Add Settings section to the guide:
```html
<section id="settings">
    <h2>Settings</h2>
    <p>Customize Executive Brain to match your schedule and preferences.</p>

    <h3>Schedule Settings</h3>
    <ul>
        <li><strong>Work Days</strong>: Which days are work days (affects scheduling)</li>
        <li><strong>Work Hours</strong>: When your work day starts and ends</li>
        <li><strong>Peak Focus Window</strong>: Your best time for deep work</li>
        <li><strong>Low Energy Period</strong>: When to schedule easier tasks</li>
        <li><strong>Medication Timing</strong>: When medication kicks in (affects scheduling)</li>
    </ul>

    <h3>Task Settings</h3>
    <ul>
        <li><strong>Default Duration</strong>: Default time for new tasks</li>
        <li><strong>Buffer Time</strong>: Gap between scheduled tasks</li>
        <li><strong>Max Daily Work</strong>: Total work time limit per day</li>
        <li><strong>Task Size</strong>: Preferred task duration range</li>
    </ul>

    <h3>Rules</h3>
    <ul>
        <li><strong>Deep Focus Morning Only</strong>: Schedule hard tasks only in focus window</li>
        <li><strong>Meeting Preference</strong>: When to schedule meetings</li>
        <li><strong>Auto-reschedule</strong>: Move low priority tasks when overloaded</li>
    </ul>

    <h3>Routines</h3>
    <p>Add recurring events like morning routines, standups, or focus blocks.</p>

    <h3>Display</h3>
    <ul>
        <li><strong>Theme</strong>: Light, Dark, or System (follows OS)</li>
        <li><strong>Default View</strong>: Which page to show on launch</li>
    </ul>
</section>
```

### Update CLAUDE.md
Update Danny's Profile to reference settings:
```markdown
## Danny's Profile

*Note: These are default values. Actual preferences are in `data/settings.json` and can be changed via the Settings page.*

- **Work hours**: Configurable (default: 9am - 5pm)
- **Peak focus window**: Configurable (default: 9am - 12pm)
...

When scheduling, always check current settings:
\`\`\`javascript
const settings = require('./services/settings');
const schedule = settings.getScheduleSettings();
// Use schedule.workHours, schedule.peakFocusWindow, etc.
\`\`\`
```

## Acceptance Criteria
- [ ] README.md has settings files in table
- [ ] HOW-IT-WORKS.md explains settings architecture
- [ ] guide.html has complete Settings section
- [ ] CLAUDE.md references configurable settings
- [ ] All code examples are accurate
- [ ] No outdated information

## Self-Verification
```bash
# Check files were updated
git diff docs/README.md
git diff docs/HOW-IT-WORKS.md
git diff public/guide.html
git diff CLAUDE.md

# Verify guide.html renders correctly
# Open http://localhost:3001/guide.html and check Settings section

# Search for outdated hardcoded values
grep -r "9am - 5pm\|9am-12pm" docs/ CLAUDE.md
# Should only appear as "default" examples, not as fixed values
```

## Error Recovery
If documentation is unclear:
1. Read the actual implementation code
2. Test the feature manually
3. Update docs to match actual behavior
4. Have someone else review for clarity

## Do NOT
- Do NOT leave outdated information
- Do NOT skip any of the 4 documentation files
- Do NOT use technical jargon in guide.html (user-facing)
- Do NOT forget to mention default values
```

---

## Quick Reference: Running Steps

```bash
# Step 1.1: Settings Service
# Copy prompt, paste to Claude Code

# Step 1.2: Settings API
# Copy prompt, paste to Claude Code

# Step 1.3: Integration
# Copy prompt, paste to Claude Code

# Step 2.1: Settings HTML
# Copy prompt, paste to Claude Code

# Step 2.2: Settings JavaScript
# Copy prompt, paste to Claude Code

# Step 2.3: Routines UI
# Copy prompt, paste to Claude Code

# Step 3.1: Theme System
# Copy prompt, paste to Claude Code

# Step 4.1: Tests
# Copy prompt, paste to Claude Code

# Step 4.2: Documentation
# Copy prompt, paste to Claude Code
```

Each prompt is self-contained with all context needed. The AI will read required files, implement, test, and self-correct.

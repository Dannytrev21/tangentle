# Settings Page Implementation Plan

## Executive Summary

This plan outlines the implementation of a comprehensive Settings page for Executive Brain, allowing users to configure scheduling preferences, work hours, routines, and personal ADHD management settings.

---

## Tree of Thought Analysis

### 1. What Settings Are Needed?

#### Hypothesis A: Minimal Settings (Time-focused only)
- Just work hours and peak focus times
- Simple, quick to implement
- **Verdict:** Too limited - misses scheduling rules and personal preferences

#### Hypothesis B: Comprehensive Time & Task Settings
- Work hours, focus windows, energy patterns
- Task defaults (duration, buffer, limits)
- Scheduling rules
- **Verdict:** Good balance - covers most use cases

#### Hypothesis C: Full Personalization System
- Everything in B plus:
- ADHD strategy preferences
- Notification settings
- Integration configs (TickTick project mappings)
- Theme preferences
- **Verdict:** Best long-term, but can be phased

#### **Selected: Hypothesis B + prioritized items from C**

### Settings Categories Identified:

```
1. SCHEDULE SETTINGS
   ├── Work Days (which days are workdays vs weekends)
   ├── Work Hours (start/end time)
   ├── Peak Focus Window (start/end)
   ├── Low Energy Period (start/end)
   └── Medication Timing (if applicable)

2. TASK DEFAULTS
   ├── Default Task Duration (minutes)
   ├── Buffer Between Tasks (minutes)
   ├── Max Daily Work Time (minutes)
   ├── Preferred Task Size (min-max range)
   └── Max Tasks Per Energy Level (low/medium/high)

3. SCHEDULING RULES
   ├── Deep Focus Tasks → Morning Only (boolean)
   ├── Meetings Preferred Time (morning/afternoon/any)
   ├── Auto-reschedule Low Priority (boolean)
   └── Break Reminders (frequency)

4. ROUTINES & RECURRING EVENTS
   ├── Morning Routine (time, duration)
   ├── Evening Review (time, duration)
   ├── Standing Meetings (list)
   └── Focus Blocks (list)

5. DISPLAY PREFERENCES
   ├── Theme (light/dark/system)
   ├── Default View (chat/schedule/projects)
   └── Show Completed Tasks (boolean)
```

---

### 2. How Should Settings Be Stored?

#### Hypothesis A: Extend ai-memory.json
- Pros: Already exists, services already load it
- Cons: Mixing concerns, file is large and has other purposes
- **Verdict:** Not ideal - violates single responsibility

#### Hypothesis B: New data/settings.json file
- Pros: Clean separation, easy to backup/restore, versionable
- Cons: Need to create loader, sync mechanism
- **Verdict:** Best approach - clear and maintainable

#### Hypothesis C: LocalStorage (frontend only)
- Pros: Simple, no backend changes
- Cons: Not accessible by server/AI, lost on browser clear
- **Verdict:** No - settings must be available to Gemini scheduler

#### Hypothesis D: Environment Variables
- Pros: Standard config approach
- Cons: Requires restart, not user-friendly
- **Verdict:** No - need runtime updates

#### **Selected: Hypothesis B - data/settings.json**

### Storage Schema:

```json
{
  "version": "1.0",
  "lastUpdated": "2025-12-12T00:00:00Z",

  "schedule": {
    "workDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "workHours": { "start": "09:00", "end": "17:00" },
    "peakFocusWindow": { "start": "09:00", "end": "12:00" },
    "lowEnergyPeriod": { "start": "14:00", "end": "16:00" },
    "medicationTime": "06:00",
    "medicationKickIn": "07:00"
  },

  "tasks": {
    "defaultDuration": 30,
    "bufferMinutes": 10,
    "maxDailyMinutes": 360,
    "preferredSizeRange": { "min": 15, "max": 30 },
    "maxTasksByEnergy": { "low": 2, "medium": 4, "high": 6 }
  },

  "rules": {
    "deepFocusMorningOnly": true,
    "meetingPreference": "afternoon",
    "autoRescheduleLowPriority": true,
    "breakReminderMinutes": 90
  },

  "routines": [
    {
      "id": "morning-routine",
      "name": "Morning Routine",
      "time": "07:00",
      "duration": 60,
      "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
      "enabled": true
    }
  ],

  "display": {
    "theme": "system",
    "defaultView": "chat",
    "showCompletedTasks": false
  }
}
```

---

### 3. How Should the UI Be Designed?

#### Hypothesis A: Modal Dialog
- Pros: Quick access, no navigation
- Cons: Limited space, feels cramped for many settings
- **Verdict:** Not ideal for comprehensive settings

#### Hypothesis B: Dedicated Page (settings.html)
- Pros: Consistent with existing pages, ample space, organized
- Cons: Navigation required
- **Verdict:** Best for comprehensive settings

#### Hypothesis C: Slide-out Panel
- Pros: Accessible from any page, modern feel
- Cons: More complex to implement, may conflict with focus mode
- **Verdict:** Could be future enhancement

#### **Selected: Hypothesis B - Dedicated settings.html page**

### UI Layout:

```
┌─────────────────────────────────────────────────────────┐
│  [Chat] [Schedule] [Projects] [Settings] [Guide]  🌙    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ⚙️ Settings                                            │
│                                                         │
│  ┌─────────────┐ ┌────────────────────────────────────┐│
│  │ Schedule    │ │                                    ││
│  │ Tasks       │ │  [Active Section Content]          ││
│  │ Rules       │ │                                    ││
│  │ Routines    │ │  Form fields for selected          ││
│  │ Display     │ │  category                          ││
│  │             │ │                                    ││
│  │             │ │  [Save Changes] [Reset Defaults]   ││
│  └─────────────┘ └────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### 4. How Should Settings Sync Across Services?

#### Hypothesis A: Reload on Every Request
- Pros: Always fresh
- Cons: Performance hit, file I/O on every call
- **Verdict:** Too slow

#### Hypothesis B: Load on Startup + File Watcher
- Pros: Fast runtime, automatic updates
- Cons: Slightly more complex
- **Verdict:** Best approach - matches existing patterns

#### Hypothesis C: In-Memory Cache with API Invalidation
- Pros: Fast, controlled updates
- Cons: Manual invalidation needed
- **Verdict:** Good, but file watcher is simpler

#### **Selected: Hypothesis B - Startup load + chokidar file watcher**

---

## Implementation Plan

### Phase 1: Backend Foundation

#### Step 1.1: Create Settings Service

**Context:**
The settings service will be the single source of truth for all user preferences. It loads settings from `data/settings.json`, provides defaults, and watches for changes.

**High-Level Steps:**
1. Create `src/services/settings.js`
2. Define default settings object
3. Implement load/save functions
4. Add file watcher for live updates
5. Export getter functions for each setting category

**Acceptance Criteria:**
- [ ] `settings.js` exists with complete default settings
- [ ] `loadSettings()` reads from file or returns defaults
- [ ] `saveSettings(settings)` writes to file with validation
- [ ] `getScheduleSettings()`, `getTaskSettings()`, etc. return relevant sections
- [ ] File watcher triggers reload on external changes
- [ ] Settings are validated before saving (times are valid, numbers in range)

**Testing:**
```bash
# Unit test: Create tests/unit/settings.test.js
npm test -- --grep "settings"

# Manual test:
# 1. Delete data/settings.json, restart server - should create with defaults
# 2. Edit data/settings.json manually - server should log reload
# 3. Call settings API - should return current values
```

**Documentation Update:**
- Add settings.js to README.md files table
- Document settings schema in HOW-IT-WORKS.md

---

#### Step 1.2: Create Settings API Endpoints

**Context:**
REST endpoints allow the frontend to read and update settings. Following existing patterns in server.js.

**High-Level Steps:**
1. Add `GET /api/settings` - returns all settings
2. Add `PUT /api/settings` - updates all settings
3. Add `PATCH /api/settings/:category` - updates one category
4. Add `POST /api/settings/reset` - resets to defaults
5. Add validation middleware
6. Broadcast changes via WebSocket

**Acceptance Criteria:**
- [ ] `GET /api/settings` returns current settings JSON
- [ ] `PUT /api/settings` saves entire settings object
- [ ] `PATCH /api/settings/schedule` updates only schedule section
- [ ] `POST /api/settings/reset` restores defaults
- [ ] Invalid settings return 400 with error details
- [ ] WebSocket broadcasts `settings-updated` event on changes

**Testing:**
```bash
# Test GET
curl http://localhost:3001/api/settings | jq

# Test PATCH
curl -X PATCH http://localhost:3001/api/settings/schedule \
  -H "Content-Type: application/json" \
  -d '{"workHours": {"start": "08:00", "end": "16:00"}}'

# Test validation (should fail)
curl -X PATCH http://localhost:3001/api/settings/tasks \
  -H "Content-Type: application/json" \
  -d '{"defaultDuration": -5}'
```

**Documentation Update:**
- Add API endpoints to HOW-IT-WORKS.md API section

---

#### Step 1.3: Integrate Settings with Existing Services

**Context:**
Replace hardcoded values in ai-memory.js, server.js, and schedule-reprioritize.js with settings service calls.

**High-Level Steps:**
1. Import settings service in ai-memory.js
2. Replace hardcoded `userPreferences` with settings getters
3. Update `buildReprioritizePrompt()` to use dynamic settings
4. Update `createFallbackResponse()` to use settings
5. Update energy level task limits in server.js

**Acceptance Criteria:**
- [ ] `ai-memory.js` uses `settingsService.getScheduleSettings()`
- [ ] `schedule-reprioritize.js` prompt includes actual user settings
- [ ] Changing settings immediately affects next AI scheduling call
- [ ] No hardcoded time values remain in scheduling logic

**Testing:**
```bash
# 1. Change peak focus to 10:00-14:00 via API
# 2. Trigger AI reprioritize
# 3. Verify scheduled tasks respect new focus window

curl -X PATCH http://localhost:3001/api/settings/schedule \
  -H "Content-Type: application/json" \
  -d '{"peakFocusWindow": {"start": "10:00", "end": "14:00"}}'

# Check AI memory context includes new times
curl http://localhost:3001/api/ai-memory/claude-context | jq '.preferences'
```

**Documentation Update:**
- Update CLAUDE.md Danny's Profile section to note settings are configurable

---

### Phase 2: Frontend Implementation

#### Step 2.1: Create Settings Page HTML

**Context:**
New page following existing patterns (schedule.html, projects.html). Tabbed interface for setting categories.

**High-Level Steps:**
1. Create `public/settings.html`
2. Add navigation tab to all pages (index.html, schedule.html, projects.html, guide.html)
3. Create sidebar with category tabs
4. Create form sections for each category
5. Add Save/Reset buttons
6. Style consistently with existing pages

**Acceptance Criteria:**
- [ ] `settings.html` is accessible at `/settings.html`
- [ ] Navigation shows Settings tab on all pages
- [ ] Sidebar shows: Schedule, Tasks, Rules, Routines, Display
- [ ] Each section has appropriate form inputs
- [ ] Forms are pre-populated with current values on load
- [ ] Responsive design works on mobile
- [ ] Matches existing visual style (colors, fonts, spacing)

**Testing:**
```
Manual testing checklist:
[ ] Navigate to settings from each page
[ ] Each sidebar tab shows correct content
[ ] All form fields are visible and labeled
[ ] Time inputs accept valid times
[ ] Number inputs have min/max constraints
[ ] Checkbox/toggle states are correct
[ ] Mobile view is usable
```

**Documentation Update:**
- Add Settings page to guide.html user documentation
- Add screenshot to README if applicable

---

#### Step 2.2: Implement Settings JavaScript

**Context:**
JavaScript to load, display, edit, and save settings. Handle WebSocket updates for multi-tab sync.

**High-Level Steps:**
1. Create settings loading function
2. Create form population function
3. Add change handlers for all inputs
4. Implement save functionality with validation
5. Add reset to defaults functionality
6. Listen for WebSocket `settings-updated` events
7. Show success/error notifications

**Acceptance Criteria:**
- [ ] Settings load on page open
- [ ] All form fields show current values
- [ ] Changes are tracked (unsaved changes warning)
- [ ] Save button sends PATCH request
- [ ] Success/error toast notifications appear
- [ ] Reset button confirms before resetting
- [ ] WebSocket updates refresh form in other tabs

**Testing:**
```
Manual testing checklist:
[ ] Change a setting, see unsaved indicator
[ ] Save changes, see success notification
[ ] Refresh page, settings persist
[ ] Open two tabs, change in one, other updates
[ ] Try invalid input, see validation error
[ ] Reset to defaults, confirm dialog appears
[ ] After reset, all fields show defaults
```

**Documentation Update:**
- Document settings sync behavior in HOW-IT-WORKS.md

---

#### Step 2.3: Implement Routines Management UI

**Context:**
Routines are more complex - need add/edit/delete functionality for recurring events like morning routine, standups, focus blocks.

**High-Level Steps:**
1. Create routines list view with cards
2. Add "Add Routine" button and modal
3. Implement edit modal for existing routines
4. Add delete with confirmation
5. Support recurring patterns (daily, specific days, weekdays)
6. Validate time conflicts

**Acceptance Criteria:**
- [ ] Routines section shows list of current routines
- [ ] Each routine shows: name, time, days, enabled toggle
- [ ] "Add Routine" opens modal with form
- [ ] Edit button opens pre-filled modal
- [ ] Delete button confirms before removing
- [ ] Days selector allows multi-select (M T W Th F Sa Su)
- [ ] Cannot create overlapping routines (warning shown)

**Testing:**
```
Manual testing checklist:
[ ] View existing routines
[ ] Add new routine with all fields
[ ] Edit existing routine
[ ] Delete routine (confirm dialog)
[ ] Toggle routine enabled/disabled
[ ] Create routine for weekdays only
[ ] Try overlapping times - see warning
```

**Documentation Update:**
- Add routines management to guide.html

---

### Phase 3: Theme System

#### Step 3.1: Fix and Enhance Theme Toggle

**Context:**
Theme toggle exists but is noted as broken in futurework.md. Need to fix and integrate with settings.

**High-Level Steps:**
1. Review current theme toggle implementation
2. Fix CSS variables for light/dark themes
3. Store theme preference in settings
4. Apply theme on page load (before render to prevent flash)
5. Sync theme across all pages
6. Add "system" option that follows OS preference

**Acceptance Criteria:**
- [ ] Theme toggle works on all pages
- [ ] Theme persists across sessions
- [ ] "System" option follows OS dark mode
- [ ] No flash of wrong theme on page load
- [ ] Theme syncs across open tabs
- [ ] All UI elements respect theme (chat, forms, modals)

**Testing:**
```
Manual testing checklist:
[ ] Toggle to dark mode - all elements update
[ ] Toggle to light mode - all elements update
[ ] Select system - follows OS preference
[ ] Refresh page - theme persists
[ ] Open new tab - same theme
[ ] Change OS dark mode - system theme updates
```

**Documentation Update:**
- Update guide.html Display Settings section

---

### Phase 4: Testing & Documentation

#### Step 4.1: Create Comprehensive Tests

**Context:**
Ensure settings system is reliable with unit and integration tests.

**High-Level Steps:**
1. Create `tests/unit/settings.test.js`
2. Test settings service functions
3. Test API endpoints
4. Test validation logic
5. Create integration test for settings → scheduler flow

**Acceptance Criteria:**
- [ ] Unit tests for load/save/validate functions
- [ ] API tests for all endpoints
- [ ] Validation tests for edge cases
- [ ] Integration test: change settings → verify scheduler uses them
- [ ] All tests pass in CI

**Testing:**
```bash
npm test -- --grep "settings"
npm run test:integration
```

**Documentation Update:**
- Add testing instructions to README

---

#### Step 4.2: Update All Documentation

**Context:**
Keep all docs in sync with new settings functionality.

**High-Level Steps:**
1. Update README.md - add settings.json to files table
2. Update HOW-IT-WORKS.md - add settings architecture
3. Update guide.html - add Settings page documentation
4. Update CLAUDE.md - note settings are configurable

**Acceptance Criteria:**
- [ ] README.md documents settings.json format
- [ ] HOW-IT-WORKS.md explains settings service architecture
- [ ] guide.html has Settings section with all options explained
- [ ] CLAUDE.md references settings for Danny's profile
- [ ] All code examples are accurate

**Testing:**
```
Manual review checklist:
[ ] README matches actual file structure
[ ] HOW-IT-WORKS diagrams are accurate
[ ] guide.html is accessible and complete
[ ] No outdated information in any doc
```

---

## File Changes Summary

### New Files
```
src/services/settings.js          - Settings service
public/settings.html              - Settings page
data/settings.json                - User settings (created on first run)
tests/unit/settings.test.js       - Unit tests
```

### Modified Files
```
src/server.js                     - Add settings API endpoints
src/services/ai-memory.js         - Use settings service
src/prompts/schedule-reprioritize.js - Use dynamic settings
public/index.html                 - Add Settings nav tab
public/schedule.html              - Add Settings nav tab
public/projects.html              - Add Settings nav tab
public/guide.html                 - Add Settings nav tab + documentation
public/styles.css                 - Settings page styles, theme fixes
public/app.js                     - Theme sync improvements
docs/README.md                    - Document settings
docs/HOW-IT-WORKS.md              - Document settings architecture
CLAUDE.md                         - Reference configurable settings
```

---

## Default Settings Reference

```json
{
  "version": "1.0",
  "lastUpdated": null,

  "schedule": {
    "workDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "workHours": { "start": "09:00", "end": "17:00" },
    "peakFocusWindow": { "start": "09:00", "end": "12:00" },
    "lowEnergyPeriod": { "start": "14:00", "end": "16:00" },
    "medicationTime": "06:00",
    "medicationKickIn": "07:00"
  },

  "tasks": {
    "defaultDuration": 30,
    "bufferMinutes": 10,
    "maxDailyMinutes": 360,
    "preferredSizeRange": { "min": 15, "max": 30 },
    "maxTasksByEnergy": { "low": 2, "medium": 4, "high": 6 }
  },

  "rules": {
    "deepFocusMorningOnly": true,
    "meetingPreference": "afternoon",
    "autoRescheduleLowPriority": true,
    "breakReminderMinutes": 90
  },

  "routines": [
    {
      "id": "morning-routine",
      "name": "Morning Routine",
      "time": "07:00",
      "duration": 60,
      "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
      "enabled": true
    },
    {
      "id": "evening-review",
      "name": "Evening Review",
      "time": "17:00",
      "duration": 15,
      "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
      "enabled": true
    }
  ],

  "display": {
    "theme": "system",
    "defaultView": "chat",
    "showCompletedTasks": false
  }
}
```

---

## Implementation Order

1. **Step 1.1** - Settings Service (backend foundation)
2. **Step 1.2** - Settings API Endpoints
3. **Step 2.1** - Settings Page HTML (can start in parallel with 1.2)
4. **Step 2.2** - Settings JavaScript
5. **Step 1.3** - Integrate with Existing Services
6. **Step 2.3** - Routines Management UI
7. **Step 3.1** - Theme System Fix
8. **Step 4.1** - Comprehensive Tests
9. **Step 4.2** - Documentation Updates

Estimated total: 8-10 focused implementation sessions.

---

## Success Metrics

- [ ] User can change work hours and see it reflected in AI scheduling
- [ ] User can define weekends (e.g., Friday-Saturday instead of Saturday-Sunday)
- [ ] User can add/edit/remove routines
- [ ] Theme preference persists and works correctly
- [ ] All settings sync across browser tabs
- [ ] Settings survive server restart
- [ ] No regression in existing functionality

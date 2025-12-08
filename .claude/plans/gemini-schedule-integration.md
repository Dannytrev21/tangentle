# Gemini Flash Schedule Integration Plan

## Overview
Integrate Google Gemini Flash API to intelligently reprioritize tasks and schedules for Executive Brain. This creates a hybrid AI system where Gemini handles routine scheduling and Claude Opus handles deep reasoning.

## Success Criteria
- [ ] Gemini API successfully called from server
- [ ] Tasks are intelligently reordered based on context
- [ ] Rescheduled tasks update in TickTick
- [ ] Memory is updated for Claude Opus context
- [ ] User sees reasoning for schedule changes
- [ ] Schedule refresh takes <3 seconds

---

## Phase 1: Foundation Setup
**Goal:** Set up Gemini API integration and basic server endpoint

### Step 1.1: Environment Configuration
**Task:** Add Gemini API key to environment
**Files:** `.env`, `.env.example`
**Actions:**
1. Create `.env` file if not exists
2. Add `GEMINI_API_KEY=` placeholder
3. Create `.env.example` with placeholder for documentation
4. Add `.env` to `.gitignore` if not already present

**Verification:**
```bash
grep "GEMINI_API_KEY" .env.example
grep ".env" .gitignore
```

### Step 1.2: Install Gemini SDK
**Task:** Add Google Generative AI package
**Files:** `package.json`
**Actions:**
1. Run `npm install @google/generative-ai`
2. Verify installation in package.json

**Verification:**
```bash
grep "@google/generative-ai" package.json
```

### Step 1.3: Create Gemini Service Module
**Task:** Create reusable Gemini API wrapper
**Files:** `src/services/gemini.js` (new file)
**Actions:**
1. Create `src/services/` directory if not exists
2. Create `gemini.js` with:
   - Initialize Gemini client with API key
   - Export `callGemini(prompt, options)` function
   - Handle errors gracefully
   - Add retry logic (1 retry on failure)
   - Log API calls for debugging

**Code Structure:**
```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async generate(prompt, options = {}) {
    // Implementation with retry logic
  }

  async generateJSON(prompt, schema) {
    // Implementation that ensures JSON output
  }
}

module.exports = new GeminiService();
```

**Verification:**
```bash
node -e "const g = require('./src/services/gemini.js'); console.log(typeof g.generate)"
```

### Step 1.4: Create Schedule Reprioritization Endpoint
**Task:** Add POST `/api/schedule/reprioritize` endpoint
**Files:** `src/server.js`
**Actions:**
1. Add new route handler
2. Accept JSON body with: tasks, currentTime, energyLevel, rules
3. Call Gemini service
4. Return reprioritized schedule

**Request Format:**
```json
{
  "tasks": [...],
  "currentTime": "2025-12-08T14:30:00",
  "energyLevel": "medium",
  "dayType": "workday",
  "completedToday": [...],
  "rules": {...}
}
```

**Response Format:**
```json
{
  "success": true,
  "schedule": [...],
  "reasoning": "...",
  "updates": [...],
  "memoryUpdates": {...}
}
```

**Verification:**
```bash
curl -X POST http://localhost:3001/api/schedule/reprioritize \
  -H "Content-Type: application/json" \
  -d '{"tasks":[],"currentTime":"2025-12-08T14:30:00"}' | jq .
```

---

## Phase 2: Prompt Engineering & Intelligence
**Goal:** Create effective prompts that produce accurate, ADHD-friendly schedules

### Step 2.1: Create Prompt Template System
**Task:** Build structured prompt templates
**Files:** `src/prompts/schedule-reprioritize.js` (new file)
**Actions:**
1. Create `src/prompts/` directory
2. Create template with sections:
   - System context (ADHD-aware assistant)
   - Current time and energy state
   - Task list with metadata
   - Scheduling rules
   - Output format specification
   - Chain-of-thought instructions

**Template Structure:**
```javascript
function buildReprioritizePrompt(context) {
  return `
## ROLE
You are an ADHD-aware scheduling assistant. Your job is to create realistic,
achievable schedules that work WITH the ADHD brain, not against it.

## CURRENT CONTEXT
- Current Time: ${context.currentTime}
- Day Type: ${context.dayType}
- Energy Level: ${context.energyLevel}
- Already Completed Today: ${context.completedCount} tasks

## DANNY'S PROFILE
- Peak focus: 9am-12pm (Vyvanse window)
- Task preference: 15-30 minute chunks
- Energy dip: 2-4pm typical
- Medication: Vyvanse taken ~6am

## TODAY'S TASKS
${formatTasks(context.tasks)}

## SCHEDULING RULES
1. High priority + due today = must schedule
2. Deep focus work → morning slots only
3. Admin/routine → afternoon okay
4. Never schedule >6 hours of work
5. Include buffer time between tasks
6. If task won't fit today, suggest when to move it

## YOUR TASK
Analyze the tasks and create an optimized schedule. Think step by step:
1. What MUST get done today? (hard deadlines, high priority)
2. What SHOULD get done today? (important but flexible)
3. What CAN wait? (nice to have)
4. Are there any conflicts or overload?
5. What's the optimal order given energy patterns?

## OUTPUT FORMAT
Respond with valid JSON only:
{
  "thinking": "Your step-by-step reasoning here...",
  "schedule": [
    {
      "taskId": "string",
      "title": "string",
      "scheduledTime": "HH:MM",
      "duration": minutes,
      "priority": "must|should|can",
      "reason": "Why scheduled here"
    }
  ],
  "rescheduled": [
    {
      "taskId": "string",
      "title": "string",
      "newDate": "YYYY-MM-DD or 'tomorrow' or 'monday' or 'weekend'",
      "reason": "Why moved"
    }
  ],
  "warnings": ["Any concerns about the schedule"],
  "summary": "One sentence summary for the user"
}
`;
}
```

**Verification:**
- Manually test prompt in Google AI Studio
- Verify JSON output is parseable

### Step 2.2: Define Scheduling Rules Configuration
**Task:** Create configurable rules file
**Files:** `data/scheduling-rules.json` (new file)
**Actions:**
1. Create rules configuration:
   - Peak hours definition
   - Task type to time slot mapping
   - Maximum daily work hours
   - Buffer time requirements
   - Reschedule preferences (tomorrow vs monday vs weekend)

**Structure:**
```json
{
  "peakHours": { "start": "09:00", "end": "12:00" },
  "adminHours": { "start": "13:00", "end": "17:00" },
  "maxDailyMinutes": 360,
  "bufferMinutes": 10,
  "defaultTaskDuration": 30,
  "reschedulePreferences": {
    "work": "next_workday",
    "personal": "weekend",
    "urgent": "tomorrow"
  },
  "energyMapping": {
    "high": ["deep_focus", "creative", "difficult"],
    "medium": ["admin", "meetings", "email"],
    "low": ["routine", "easy", "review"]
  }
}
```

**Verification:**
```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('data/scheduling-rules.json')))"
```

### Step 2.3: Implement Response Parser
**Task:** Parse and validate Gemini response
**Files:** `src/services/schedule-parser.js` (new file)
**Actions:**
1. Parse JSON from Gemini response
2. Validate required fields exist
3. Validate time formats
4. Validate task IDs match input
5. Handle malformed responses gracefully
6. Return structured result or error

**Verification:**
```javascript
// Test with sample response
const parser = require('./src/services/schedule-parser.js');
const result = parser.parse(sampleGeminiResponse);
console.log(result.isValid, result.errors);
```

### Step 2.4: Add Response Caching
**Task:** Cache recent responses to avoid redundant API calls
**Files:** `src/services/gemini.js` (update)
**Actions:**
1. Add simple in-memory cache
2. Cache key = hash of input tasks + time rounded to 15min
3. Cache TTL = 5 minutes
4. Return cached response if available

**Verification:**
- Call endpoint twice with same data
- Second call should be <50ms

---

## Phase 3: Memory Integration
**Goal:** Update shared memory so Claude Opus has context

### Step 3.1: Design Memory Schema
**Task:** Define memory structure for AI context sharing
**Files:** `data/ai-memory.json` (new file)

**High-Level Structure:**
```json
{
  "lastUpdated": "ISO timestamp",
  "recentDecisions": [],      // Last 20 scheduling decisions
  "observedPatterns": [],     // Patterns Gemini has noticed
  "userPreferences": {},      // Learned preferences
  "currentContext": {},       // Today's state
  "forClaudeOpus": {}         // Summarized context for deep sessions
}
```

### Step 3.2: Implement Memory Service
**Task:** Create read/write service for AI memory
**Files:** `src/services/ai-memory.js` (new file)

**Key Functions:**
- `getMemory()` - Read current memory
- `addDecision(decision)` - Log a scheduling decision
- `addPattern(pattern)` - Record observed pattern
- `updateContext(context)` - Update current state
- `getClaudeContext()` - Get summarized context for Opus
- `pruneOldData()` - Keep memory bounded

### Step 3.3: Integrate Memory Updates
**Task:** Update memory after each Gemini call
**Files:** `src/server.js` (update endpoint)

**Actions:**
- After successful reprioritization, call memory service
- Store: what was rescheduled, why, patterns noticed
- Update current context

---

## Phase 4: TickTick Sync
**Goal:** Apply schedule changes to TickTick

### Step 4.1: Implement Task Update Logic
**Task:** Update TickTick tasks based on Gemini output
**Files:** `src/services/ticktick-sync.js` (new file)

**Key Functions:**
- `updateTaskDueDate(taskId, projectId, newDate)`
- `updateTaskPriority(taskId, projectId, priority)`
- `batchUpdateTasks(updates)`

### Step 4.2: Handle Reschedule Actions
**Task:** Move tasks to new dates in TickTick
**Files:** `src/server.js` (update endpoint)

**Actions:**
- Parse `rescheduled` array from Gemini
- Convert relative dates ("tomorrow", "monday") to actual dates
- Call TickTick MCP to update due dates
- Log changes to memory

---

## Phase 5: Frontend Integration
**Goal:** Connect schedule.html to new reprioritization endpoint

### Step 5.1: Add Reprioritize Button
**Task:** Add UI trigger for intelligent reprioritization
**Files:** `public/schedule.html`

### Step 5.2: Display AI Reasoning
**Task:** Show user why schedule was arranged this way
**Files:** `public/schedule.html`

### Step 5.3: Add Loading States
**Task:** Show progress during API call
**Files:** `public/schedule.html`

---

## Phase 6: Event Triggers
**Goal:** Auto-refresh schedule on meaningful events

### Step 6.1: Trigger on Task Completion
**Task:** Refresh schedule when task marked done

### Step 6.2: Trigger on Task Addition
**Task:** Refresh schedule when new task added

### Step 6.3: Add Manual Override
**Task:** Allow user to prevent auto-refresh

---

## Testing Checklist

### Phase 1 Tests
- [ ] Gemini API key loads from .env
- [ ] Gemini service can make API call
- [ ] Endpoint returns valid JSON
- [ ] Error handling works (bad API key, network error)

### Phase 2 Tests
- [ ] Prompt produces valid JSON output
- [ ] Schedule respects peak hours
- [ ] Overloaded days trigger rescheduling
- [ ] Response parser handles edge cases

### Phase 3 Tests
- [ ] Memory file created and updated
- [ ] Decisions are logged
- [ ] Memory doesn't grow unbounded
- [ ] Claude can read memory context

### Phase 4 Tests
- [ ] TickTick tasks update correctly
- [ ] Relative dates convert properly
- [ ] Failed updates don't crash system

### Phase 5 Tests
- [ ] Button triggers reprioritization
- [ ] Schedule updates in UI
- [ ] Reasoning is displayed
- [ ] Loading state shows

### Phase 6 Tests
- [ ] Task completion triggers refresh
- [ ] User can disable auto-refresh
- [ ] No duplicate refreshes

---

## Rollback Plan

If issues arise:
1. Disable Gemini calls by setting `GEMINI_ENABLED=false`
2. Endpoint falls back to simple priority sort
3. Memory updates stop but don't break app
4. TickTick sync can be disabled independently

---

## Progress Tracking

### Current Phase: Not Started
### Current Step: None
### Blockers: None
### Notes:

---

*Last Updated: 2025-12-08*
*Plan Version: 1.0*

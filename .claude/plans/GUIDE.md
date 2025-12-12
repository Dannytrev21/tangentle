# Automated Planning System - User Guide

A comprehensive guide to using the Executive Brain planning system for high-quality feature implementation.

---

## Table of Contents
1. [Quick Start](#quick-start)
2. [Core Concepts](#core-concepts)
3. [Step-by-Step Workflows](#step-by-step-workflows)
4. [Command Reference](#command-reference)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)

---

## Quick Start

### Your First Plan in 3 Commands

```bash
# 1. Create a plan for your feature
/plan-feature Build a user settings page with preferences for work hours and theme

# 2. Generate AI prompts for each step
/plan-prompts 001

# 3. Start implementing (repeat until done)
/plan-next 001
```

That's it! The system will guide you through each step with verification and self-correction.

---

## Core Concepts

### What is a Plan?
A plan is a structured approach to implementing a feature, containing:
- **Tree of Thought analysis** - Evaluated options for major decisions
- **Step-by-step breakdown** - Manageable implementation chunks
- **AI prompts** - Self-contained instructions for each step
- **Progress tracking** - State that survives session changes
- **Context preservation** - Notes for resuming after breaks

### Why Use This System?
| Without Planning System | With Planning System |
|------------------------|---------------------|
| Ad-hoc implementation | Structured approach |
| Lost context after breaks | Preserved in context.md |
| Inconsistent quality | Verified at each step |
| Manual error recovery | Self-correction built in |
| No documentation trail | ADR + context created |

### Key Files

```
.claude/plans/001-feature-name/
├── plan.md           # What we're building and why
├── adr.md            # Architecture decisions made
├── steps/            # Detailed step specifications
│   ├── 01-first-step.md
│   └── 02-second-step.md
├── prompts/          # AI prompts for execution
│   ├── 01-first-step.prompt.md
│   └── 02-second-step.prompt.md
├── progress.json     # Machine-readable state
└── context.md        # Human-readable context
```

---

## Step-by-Step Workflows

### Workflow 1: Starting a New Feature

#### Step 1: Create the Plan
```bash
/plan-feature <describe your feature in detail>
```

**Example:**
```bash
/plan-feature Build a notification system that alerts users when tasks
are overdue, supports both email and in-app notifications, and allows
users to configure notification preferences and quiet hours.
```

**What happens:**
1. AI analyzes the feature request
2. Creates Tree of Thought analysis for major decisions
3. Breaks down into implementable steps
4. Creates plan.md, adr.md, steps/, progress.json, context.md

**Output shows:**
- Plan number (e.g., 001)
- Number of steps
- Directory location
- Next command to run

#### Step 2: Generate Prompts
```bash
/plan-prompts 001
```

**What happens:**
1. Reads plan and step files
2. Generates optimized AI prompt for each step
3. Each prompt is self-contained (no prior context needed)
4. Updates progress.json to mark prompts generated

**Output shows:**
- List of generated prompt files
- Ready status for each step

#### Step 3: Execute Steps
```bash
/plan-next 001
```

**What happens:**
1. Loads current step from progress.json
2. Reads context from previous work
3. Executes the step's prompt
4. Runs verification
5. On success: updates progress, advances to next step
6. On failure: attempts self-correction (2x), then marks blocked

**Repeat** `/plan-next 001` until all steps complete.

---

### Workflow 2: Resuming After a Break

Whether you took a coffee break, closed your terminal, or it's a new day:

```bash
# 1. Check where you left off
/plan-status 001

# 2. Read the context (optional but helpful)
cat .claude/plans/001-*/context.md

# 3. Continue from where you stopped
/plan-next 001
```

**The system automatically:**
- Loads your previous context
- Shows what's been completed
- Picks up at the correct step
- Preserves all previous learnings

---

### Workflow 3: Handling Failures

#### When a Step Fails Verification

```bash
# 1. See what failed
/plan-verify 001

# Output shows:
# ✓ AC1: Passed
# ✗ AC2: FAILED - specific error
# ✓ AC3: Passed
```

#### Option A: The AI Self-Corrected
If the failure was simple, `/plan-next` already tried to fix it. Check the output.

#### Option B: Manual Fix Needed
```bash
# 1. Review the failure details in output
# 2. Make your fix manually
# 3. Re-run verification
/plan-verify 001

# 4. If passing, continue
/plan-next 001
```

#### Option C: Start the Step Over
```bash
# Rollback all changes from current step
/plan-rollback 001

# Try again fresh
/plan-next 001
```

---

### Workflow 4: Checking Progress

#### See All Plans
```bash
/plan-status
```

**Output:**
```
| # | Plan | Status | Progress |
|---|------|--------|----------|
| 001 | settings-page | in_progress | 5/9 (55%) |
| 002 | notifications | not_started | 0/7 (0%) |
```

#### See Specific Plan Details
```bash
/plan-status 001
```

**Output includes:**
- Progress bar
- Step-by-step status
- Files created/modified
- Current blockers
- Recent learnings

---

### Workflow 5: Working on Multiple Plans

You can have multiple plans in progress:

```bash
# Work on settings
/plan-next 001

# Switch to notifications
/plan-next 002

# Check both
/plan-status
```

Each plan maintains its own state independently.

---

## Command Reference

### /plan-feature

**Purpose:** Create a new implementation plan

**Syntax:**
```bash
/plan-feature <feature description>
```

**Arguments:**
- `<feature description>` - Detailed description of what to build

**Example:**
```bash
/plan-feature Add dark mode support with system preference detection
and manual toggle, persisting preference across sessions
```

**Creates:**
- `.claude/plans/{NNN}-{slug}/plan.md`
- `.claude/plans/{NNN}-{slug}/adr.md`
- `.claude/plans/{NNN}-{slug}/steps/*.md`
- `.claude/plans/{NNN}-{slug}/progress.json`
- `.claude/plans/{NNN}-{slug}/context.md`

---

### /plan-prompts

**Purpose:** Generate AI-optimized prompts for each step

**Syntax:**
```bash
/plan-prompts <plan-number>
```

**Arguments:**
- `<plan-number>` - The plan number (e.g., 001) or partial match

**Example:**
```bash
/plan-prompts 001
/plan-prompts settings  # Partial match works
```

**Creates:**
- `.claude/plans/{NNN}-{slug}/prompts/*.prompt.md`

---

### /plan-next

**Purpose:** Execute the next step in a plan

**Syntax:**
```bash
/plan-next <plan-number>
```

**Arguments:**
- `<plan-number>` - The plan number or partial match

**Example:**
```bash
/plan-next 001
```

**Behavior:**
1. Finds current step from progress.json
2. Loads and executes the prompt
3. Runs verification commands
4. Updates progress on success
5. Attempts self-correction on failure (2x)
6. Marks blocked if still failing

---

### /plan-status

**Purpose:** Check progress on plans

**Syntax:**
```bash
/plan-status [plan-number]
```

**Arguments:**
- `[plan-number]` - Optional. If omitted, shows all plans

**Examples:**
```bash
/plan-status        # All plans
/plan-status 001    # Specific plan
```

---

### /plan-verify

**Purpose:** Re-run verification for current step

**Syntax:**
```bash
/plan-verify <plan-number>
```

**Use when:**
- Previous verification failed
- You made manual fixes
- You want to check current state

---

### /plan-rollback

**Purpose:** Undo changes from current step

**Syntax:**
```bash
/plan-rollback <plan-number>
```

**What it does:**
- Reverts modified files to pre-step state
- Deletes files created in current step
- Resets step status to "pending"
- Preserves attempt count and notes

**Use when:**
- Step implementation went wrong
- Want to try a different approach
- Need a clean slate for current step

---

## Best Practices

### Writing Good Feature Descriptions

**Bad:**
```bash
/plan-feature Add settings
```

**Good:**
```bash
/plan-feature Build a settings page that allows users to configure:
- Work hours (start/end time)
- Work days (which days are workdays)
- Peak focus window timing
- Theme preference (light/dark/system)
Settings should persist to a JSON file and be accessible via REST API.
```

**Why it matters:** Better descriptions lead to better Tree of Thought analysis and more accurate step breakdowns.

---

### Optimal Step Size

Each step should be:
- **30-90 minutes** of focused work
- **Single responsibility** (one main task)
- **Testable** (clear pass/fail criteria)
- **Independent** where possible

If a step feels too big, consider breaking the plan into more steps.

---

### When to Use Each Command

| Situation | Command |
|-----------|---------|
| Starting new feature | `/plan-feature` |
| Ready to implement | `/plan-prompts` then `/plan-next` |
| Continuing work | `/plan-next` |
| Checking progress | `/plan-status` |
| Step failed | `/plan-verify` to diagnose |
| Need fresh start on step | `/plan-rollback` |
| Something is broken | See Troubleshooting below |

---

### Keeping Context Fresh

After completing significant work, the system updates context.md automatically. However, you can add notes manually:

```bash
# Open context file
cat .claude/plans/001-settings/context.md

# The system adds entries like:
## Step 3 Complete - 2025-12-12T10:30:00Z
### What Was Done
Created settings HTML page with all form fields...
```

This context is loaded automatically when you resume, even after conversation compacting.

---

## Troubleshooting

### Problem: "Plan not found"

**Symptom:**
```
Plan not found: 001
```

**Causes & Solutions:**

1. **Wrong plan number**
   ```bash
   # List all plans
   ls .claude/plans/

   # Use correct number
   /plan-next 001
   ```

2. **Plan directory doesn't exist**
   ```bash
   # Create it first
   /plan-feature <your feature>
   ```

3. **Using wrong identifier**
   ```bash
   # These all work:
   /plan-next 001
   /plan-next 001-settings
   /plan-next settings  # Partial match
   ```

---

### Problem: "Prompts not generated"

**Symptom:**
```
Prompts not yet generated for this plan.
Run /plan-prompts 001 first.
```

**Solution:**
```bash
/plan-prompts 001
```

Prompts must be generated before you can run `/plan-next`.

---

### Problem: Step Keeps Failing

**Symptom:**
Step fails verification after multiple attempts.

**Diagnosis:**
```bash
# Check what's failing
/plan-verify 001
```

**Solutions:**

1. **Prerequisite not met**
   ```bash
   # Check previous step completed
   /plan-status 001

   # If previous step isn't complete, something's wrong
   ```

2. **Specification unclear**
   - Read the step file: `.claude/plans/001-*/steps/0X-*.md`
   - Read the prompt: `.claude/plans/001-*/prompts/0X-*.prompt.md`
   - Clarify requirements manually

3. **Environment issue**
   ```bash
   # Check server is running
   npx pm2 status

   # Check dependencies installed
   npm install
   ```

4. **Start fresh**
   ```bash
   /plan-rollback 001
   /plan-next 001
   ```

---

### Problem: Lost My Place After Compacting

**Symptom:**
Conversation was compacted, not sure where I was.

**Solution:**
```bash
# 1. Check status
/plan-status 001

# 2. Read context
cat .claude/plans/001-*/context.md

# 3. Continue - system knows where you are
/plan-next 001
```

The system stores all state in files, not conversation history.

---

### Problem: Want to Skip a Step

**Symptom:**
A step isn't relevant or was done manually.

**Solution:**
Edit progress.json directly:

```bash
# Open progress file
cat .claude/plans/001-settings/progress.json

# Find the step and change:
# "status": "pending" → "status": "completed"
# "verificationPassed": null → "verificationPassed": true

# Also increment currentStep
```

Or mark as skipped:
```json
{
  "status": "skipped",
  "notes": "Done manually before plan created"
}
```

---

### Problem: Made Changes Outside the Plan

**Symptom:**
You made manual changes that the plan doesn't know about.

**Solution:**
Update context.md manually:

```markdown
## Manual Changes - 2025-12-12

### What Was Done
- Added X to file Y
- Modified Z

### Impact on Plan
- Step 4 may need adjustment
- Created file that step 5 expects
```

Then continue:
```bash
/plan-next 001
```

---

### Problem: Verification Commands Don't Work

**Symptom:**
Verification commands fail but code seems correct.

**Causes & Solutions:**

1. **Server not running**
   ```bash
   npx pm2 restart brain-server
   ```

2. **Wrong port**
   ```bash
   # Check actual port
   npx pm2 logs brain-server --lines 5
   ```

3. **Command syntax issue**
   - Check the prompt file for exact command
   - Ensure proper quoting
   - Try running manually first

4. **Timing issue (async operation)**
   ```bash
   # Add delay
   sleep 2 && curl http://localhost:3001/api/test
   ```

---

### Problem: Rollback Didn't Work

**Symptom:**
Files still have changes after rollback.

**Causes & Solutions:**

1. **Changes were committed**
   ```bash
   # Rollback only affects uncommitted changes
   # For committed changes, use git:
   git revert HEAD
   ```

2. **Files not tracked**
   ```bash
   # Check git status
   git status

   # Manually delete untracked files
   rm <file>
   ```

3. **Context didn't track the files**
   - Check context.md for what was tracked
   - Manually revert files not listed

---

### Problem: Plan Has Too Many/Few Steps

**Symptom:**
Steps are too granular or too large.

**Solution:**
You can edit the plan after creation:

1. **Merge steps:**
   - Edit steps/ files to combine
   - Update progress.json step count
   - Regenerate prompts: `/plan-prompts 001`

2. **Split steps:**
   - Create new step files in steps/
   - Update progress.json
   - Regenerate prompts

3. **Start over:**
   ```bash
   # Delete plan directory
   rm -rf .claude/plans/001-feature/

   # Create new plan with better description
   /plan-feature <improved description>
   ```

---

## FAQ

### Q: Can I work on multiple plans at once?
**A:** Yes! Each plan has its own directory and state. Switch between them freely:
```bash
/plan-next 001  # Work on plan 1
/plan-next 002  # Switch to plan 2
```

### Q: What if I want to change the plan mid-implementation?
**A:** You can edit plan files directly. After editing:
1. Update `steps/` if changing step definitions
2. Run `/plan-prompts {plan}` to regenerate prompts
3. Continue with `/plan-next {plan}`

### Q: How do I see what a step will do before running it?
**A:** Read the prompt file:
```bash
cat .claude/plans/001-*/prompts/0X-*.prompt.md
```

### Q: Can I run steps out of order?
**A:** Not recommended (dependencies may break), but possible:
1. Edit progress.json to set `currentStep`
2. Run `/plan-next`

### Q: What happens to old plans?
**A:** They stay in `.claude/plans/` forever. Delete manually if unwanted:
```bash
rm -rf .claude/plans/001-old-feature/
```

### Q: How do I share a plan with someone?
**A:** The entire `.claude/plans/{NNN}-{name}/` directory is self-contained. Share the folder, and they can run:
```bash
/plan-status {plan}
/plan-next {plan}
```

### Q: Can I use this for non-code tasks?
**A:** Yes! The system works for any multi-step task. Just describe non-code tasks:
```bash
/plan-feature Write documentation for the API including endpoint
reference, authentication guide, and example requests
```

### Q: How long should a step take?
**A:** Aim for 30-90 minutes. If longer, the step is probably too big. If shorter, consider combining steps.

### Q: What if verification passes but something is wrong?
**A:** The verification is only as good as the acceptance criteria. If you find an issue:
1. Add it to context.md as a learning
2. Fix it in the current or a future step
3. Consider adding better AC for similar future steps

### Q: Can I customize the prompt template?
**A:** Yes! Edit `.claude/commands/plan-prompts.md` to change how prompts are generated. Your changes apply to new prompts.

---

## Getting Help

### Check System Status
```bash
/plan-status
```

### Read Plan Details
```bash
cat .claude/plans/001-*/plan.md
cat .claude/plans/001-*/context.md
```

### Review Commands
```bash
cat .claude/commands/plan-feature.md
cat .claude/commands/plan-next.md
```

### Start Fresh
```bash
rm -rf .claude/plans/001-*/
/plan-feature <description>
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                 PLANNING SYSTEM CHEATSHEET                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CREATE    /plan-feature <description>                      │
│  PROMPTS   /plan-prompts <plan#>                           │
│  RUN       /plan-next <plan#>                              │
│  STATUS    /plan-status [plan#]                            │
│  VERIFY    /plan-verify <plan#>                            │
│  ROLLBACK  /plan-rollback <plan#>                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  TYPICAL WORKFLOW                                           │
│                                                             │
│  /plan-feature Build X with Y and Z                        │
│  /plan-prompts 001                                         │
│  /plan-next 001    ←── repeat until done                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  IF STUCK                                                   │
│                                                             │
│  /plan-verify 001     # See what failed                    │
│  /plan-rollback 001   # Start step over                    │
│  /plan-status 001     # Check progress                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  FILES                                                      │
│                                                             │
│  .claude/plans/{NNN}-{name}/                               │
│    ├── plan.md         # Overview                          │
│    ├── adr.md          # Decisions                         │
│    ├── steps/          # Step specs                        │
│    ├── prompts/        # AI prompts                        │
│    ├── progress.json   # State                             │
│    └── context.md      # Context                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

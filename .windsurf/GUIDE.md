# Windsurf Planning System Guide

Complete documentation for the automated planning system.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Command Reference](#command-reference)
4. [Plan Structure](#plan-structure)
5. [Templates](#templates)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The planning system helps you implement complex features by:

- Breaking work into manageable 30-90 minute steps
- Applying Tree of Thought analysis for decisions
- Creating self-contained prompts that work without prior context
- Tracking progress across sessions
- Automatically attempting to fix failures

### When to Use This System

**Good for:**
- Features with multiple components
- Changes affecting several files
- Work that spans multiple sessions
- Complex decisions needing documentation

**Overkill for:**
- Simple bug fixes
- Single-file changes
- Quick configuration updates

---

## Getting Started

### Creating Your First Plan

```
/plan-feature Build a user notification system that supports
email and in-app notifications with user preferences
```

This will:
1. Analyze your feature description
2. Ask clarifying questions if needed
3. Apply Tree of Thought analysis
4. Create the plan directory with all files

### Generating Prompts

After the plan is created:

```
/plan-prompts 001
```

This generates a self-contained prompt file for each step. Each prompt includes everything needed to implement that step without any prior context.

### Executing Steps

Work through the plan step by step:

```
/plan-next 001
```

This will:
1. Load the current step's prompt
2. Guide you through implementation
3. Run verification
4. Update progress

Repeat until all steps complete.

---

## Command Reference

### /plan-feature {description}

Create a new implementation plan.

**Input:** Natural language feature description
**Output:** Complete plan directory with:
- `plan.md` - Overview and steps
- `adr.md` - Architecture decisions
- `steps/*.md` - Step specifications
- `progress.json` - Progress tracking
- `context.md` - Session context

**Example:**
```
/plan-feature Add dark mode support with user preference persistence
```

### /plan-prompts {plan#}

Generate AI prompts for each step.

**Input:** Plan number (e.g., 001) or plan name
**Output:** Prompt files in `prompts/` directory

**Example:**
```
/plan-prompts 001
/plan-prompts dark-mode
```

### /plan-next {plan#}

Execute the next pending step.

**Input:** Plan identifier
**Output:**
- Implementation guided by prompt
- Verification results
- Updated progress

**Example:**
```
/plan-next 001
```

### /plan-status {plan#}

Check progress on plans.

**Input:** Optional plan identifier (shows all if omitted)
**Output:** Progress summary with:
- Completion percentage
- Current step details
- Blockers
- Next actions

**Examples:**
```
/plan-status       # All plans
/plan-status 001   # Specific plan
```

### /plan-verify {plan#}

Re-run verification for current step.

**Input:** Plan identifier
**Output:**
- Pass/fail for each acceptance criterion
- Suggestions for failures

**Use when:** After making manual fixes to a blocked step.

### /plan-rollback {plan#}

Rollback changes from a failed step.

**Input:** Plan identifier
**Output:**
- List of files to revert
- Confirmation prompt
- Reset progress

**Use when:** Step has failed and you want to start fresh.

---

## Plan Structure

Each plan lives in `.windsurf/plans/{NNN}-{slug}/`:

```
001-user-notifications/
├── plan.md           # Main plan document
├── adr.md            # Architecture Decision Record
├── steps/            # Step specifications
│   ├── 01-setup.md
│   ├── 02-core-logic.md
│   └── 03-testing.md
├── prompts/          # AI prompts (generated)
│   ├── 01-setup.prompt.md
│   ├── 02-core-logic.prompt.md
│   └── 03-testing.prompt.md
├── progress.json     # Machine-readable state
└── context.md        # Human-readable context
```

### plan.md

Contains:
- Overview and motivation
- Tree of Thought analysis
- Implementation steps table
- Success criteria
- Rollback plan

### adr.md

Architecture Decision Record with:
- Context for the decision
- Options considered (3+)
- Selected approach with rationale
- Consequences and mitigations

### steps/*.md

Individual step specifications:
- Goal and prerequisites
- Detailed requirements
- Acceptance criteria
- Verification commands

### prompts/*.prompt.md

AI-optimized prompts including:
1. Mission
2. Context
3. Pre-Implementation checklist
4. Specification
5. Implementation guide
6. Acceptance criteria
7. Verification protocol
8. Error recovery
9. Completion protocol
10. Do NOT list

### progress.json

Machine-readable state:
```json
{
  "currentStep": 2,
  "totalSteps": 5,
  "status": "in_progress",
  "steps": [
    {"id": 1, "status": "completed"},
    {"id": 2, "status": "in_progress"}
  ]
}
```

### context.md

Human-readable session log:
- What's been done
- Key decisions
- Files changed
- Learnings
- Next steps

---

## Templates

Templates are in `.windsurf/templates/`:

| Template | Use |
|----------|-----|
| `plan-template.md` | Creating plan.md |
| `adr-template.md` | Creating adr.md |
| `step-template.md` | Creating step files |
| `prompt-template.md` | Generating prompts |
| `progress-template.json` | Initial progress state |

### Customizing Templates

Feel free to modify templates for your project's needs:
- Add project-specific sections
- Adjust acceptance criteria patterns
- Include team conventions

---

## Best Practices

### Planning

1. **Be specific in feature descriptions**
   - Bad: "Add auth"
   - Good: "Add OAuth2 authentication with Google and GitHub providers"

2. **Let Tree of Thought work**
   - Consider 3+ options for major decisions
   - Document pros/cons honestly
   - Explain selection rationale

3. **Keep steps focused**
   - Each step: 30-90 minutes
   - One clear objective per step
   - Independent when possible

### Execution

1. **Read the prompt fully before starting**
   - Check prerequisites
   - Understand the goal
   - Review acceptance criteria

2. **Verify as you go**
   - Run verification commands early
   - Don't wait until the end
   - Fix issues immediately

3. **Update progress immediately**
   - Update progress.json when done
   - Add to context.md after each session
   - Don't batch updates

### Recovery

1. **When stuck**
   - Re-read the specification
   - Check context.md for decisions
   - Use `/plan-verify` after fixes

2. **When failing repeatedly**
   - Consider if spec needs adjustment
   - Use `/plan-rollback` if needed
   - Update the plan before retrying

---

## Troubleshooting

### "Prompts not yet generated"

Run `/plan-prompts {plan#}` before `/plan-next`.

### "Plan not found"

Check plan exists:
```bash
ls .windsurf/plans/
```

Use either plan number (001) or full name.

### Step keeps failing

1. Run `/plan-verify` to see specific failures
2. Check if acceptance criteria are realistic
3. Consider `/plan-rollback` and adjusting the spec

### Progress not saving

Ensure you're updating both:
- `progress.json` (machine state)
- `context.md` (human context)

### Context lost between sessions

Read `context.md` at the start of each session. It contains all prior decisions and state.

---

## FAQ

**Q: Can I work on multiple plans?**
A: Yes, each plan is independent. Use `/plan-status` to see all.

**Q: Can I modify a plan after creation?**
A: Yes, but update progress.json if steps change.

**Q: What if a step is too big?**
A: Split it into multiple steps and update the plan.

**Q: Can I skip steps?**
A: Not recommended. Dependencies may break. Adjust the plan instead.

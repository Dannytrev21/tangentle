# Plan Status

Check progress on implementation plans.

## Description

Shows progress across one or all plans with visual indicators, blockers, and next steps.

## Steps

### 1. Determine Scope

If argument provided (`/plan-status 001`):
- Show detailed status for that specific plan

If no argument (`/plan-status`):
- Show summary of all plans

### 2. Find Plans

```bash
ls -d .windsurf/plans/[0-9]* 2>/dev/null
```

If no plans exist:
```
No plans found in .windsurf/plans/

Create one with: /plan-feature {description}
```

### 3. For Each Plan, Read Progress

Read `{plan-dir}/progress.json` and extract:
- `title` - Plan name
- `status` - not_started, in_progress, completed
- `currentStep` - Current step number
- `totalSteps` - Total steps
- `steps` - Array with status of each

### 4. Display Summary (All Plans)

```
═══════════════════════════════════════════════════════
  PLAN STATUS OVERVIEW
═══════════════════════════════════════════════════════

001-feature-name     ████████░░░░ 4/6 (67%)  In Progress
002-another-feature  ████████████ 3/3 (100%) Complete
003-third-feature    ░░░░░░░░░░░░ 0/5 (0%)   Not Started

Total: 3 plans
- Completed: 1
- In Progress: 1
- Not Started: 1

For details: /plan-status {number}
═══════════════════════════════════════════════════════
```

### 5. Display Detail (Single Plan)

```
═══════════════════════════════════════════════════════
  PLAN {NNN}: {Plan Name}
═══════════════════════════════════════════════════════

Status: {status}
Progress: {current}/{total} ({percentage}%)

## Steps
| # | Name | Status | Verification |
|---|------|--------|--------------|
| 1 | Setup | ✅ Complete | ✓ Passed |
| 2 | Core Logic | ✅ Complete | ✓ Passed |
| 3 | Testing | ⏳ In Progress | - |
| 4 | Docs | ⏸️ Pending | - |

## Current Step
Step 3: Testing
{Brief description from step file}

## Blockers
{List any from progress.json, or "None"}

## Recent Context
{Last 3-5 lines from context.md}

## Next Action
`/plan-next {NNN}` - Continue with step 3
═══════════════════════════════════════════════════════
```

### 6. Status Indicators

Use these symbols consistently:
- ✅ Complete (verification passed)
- ⏳ In Progress
- ⏸️ Pending
- ❌ Blocked (verification failed)
- ⚠️ Needs Attention

Progress bars:
- █ for completed portions
- ░ for remaining

## Quality Checklist

- [ ] All plans found and displayed
- [ ] Progress percentages accurate
- [ ] Blockers highlighted
- [ ] Next action is clear

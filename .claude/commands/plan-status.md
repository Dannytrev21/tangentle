# Plan Status Command

You are checking the status of an implementation plan.

## Input
Plan identifier (optional): $ARGUMENTS

## Process

### If No Plan Specified
List all plans with their status:

```bash
for dir in .claude/plans/[0-9]*; do
  if [ -f "$dir/progress.json" ]; then
    echo "=== $(basename $dir) ==="
    cat "$dir/progress.json" | jq '{name, status, currentStep, totalSteps}'
  fi
done
```

Output format:
```
═══════════════════════════════════════════════════════════════
  PLAN OVERVIEW
═══════════════════════════════════════════════════════════════

| # | Plan | Status | Progress |
|---|------|--------|----------|
| 001 | settings-page | in_progress | 3/9 (33%) |
| 002 | auth-system | not_started | 0/5 (0%) |
| 003 | api-refactor | completed | 7/7 (100%) |

Commands:
- `/plan-status {number}` - Detailed status
- `/plan-next {number}` - Continue a plan
- `/plan-feature {description}` - Create new plan
═══════════════════════════════════════════════════════════════
```

### If Plan Specified
Show detailed status:

1. **Read progress.json**
```bash
cat .claude/plans/$ARGUMENTS*/progress.json
```

2. **Read context.md**
```bash
cat .claude/plans/$ARGUMENTS*/context.md
```

3. **Display Detailed Status**
```
═══════════════════════════════════════════════════════════════
  PLAN {NNN}: {Plan Name}
═══════════════════════════════════════════════════════════════

## Overview
- **Status**: {status}
- **Created**: {date}
- **Last Updated**: {date}
- **Progress**: {current}/{total} steps ({percentage}%)

## Progress Bar
[████████░░░░░░░░░░░░] 40%

## Steps
| # | Step | Status | Time |
|---|------|--------|------|
| 1 | Create settings service | ✅ Complete | 45m |
| 2 | Create settings API | ✅ Complete | 30m |
| 3 | Settings page HTML | 🔄 In Progress | - |
| 4 | Settings JavaScript | ⏳ Pending | - |
| 5 | Routines UI | ⏳ Pending | - |

## Current Step Details
**Step 3: Settings page HTML**
- Started: {time}
- Attempts: {N}
- Last verification: {pass/fail}

## Context Summary
### Files Created
{list from context}

### Files Modified
{list from context}

### Key Decisions
{from context}

### Current Blockers
{from context.blockers}

### Recent Learnings
{from context.learnings}

## Commands
- `/plan-next {NNN}` - Continue implementation
- `/plan-verify {NNN}` - Re-run verification
- `/plan-prompts {NNN}` - Regenerate prompts
═══════════════════════════════════════════════════════════════
```

## Status Indicators

| Status | Icon | Meaning |
|--------|------|---------|
| not_started | ⬜ | Plan created, no work done |
| in_progress | 🔄 | Currently being worked on |
| blocked | 🚫 | Stuck on a step |
| completed | ✅ | All steps complete |
| abandoned | ❌ | Work stopped |

## Step Status

| Status | Icon | Meaning |
|--------|------|---------|
| pending | ⏳ | Not yet started |
| in_progress | 🔄 | Currently working |
| completed | ✅ | Verified complete |
| blocked | 🚫 | Failed verification |
| skipped | ⏭️ | Intentionally skipped |

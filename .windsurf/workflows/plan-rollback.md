# Plan Rollback

Rollback changes from a failed step and reset to try again.

## Description

Use this when a step has failed and you want to undo the changes to start fresh. This is a destructive operation that requires confirmation.

## Steps

### 1. Locate the Plan

```bash
PLAN_DIR=$(ls -d .windsurf/plans/$ARGUMENTS* 2>/dev/null | head -1)
```

If not found, list available plans.

### 2. Load Current State

Read `{plan-dir}/progress.json`:
- Get `currentStep`
- Get current step's status

Read `{plan-dir}/context.md`:
- Find files created in current step
- Find files modified in current step

### 3. Show What Will Be Reverted

```
═══════════════════════════════════════════════════════
  ⚠️ ROLLBACK: Step {N} - {Step Name}
═══════════════════════════════════════════════════════

This will undo changes from step {N}.

## Files to Delete (created in this step)
- {file1}
- {file2}

## Files to Revert (modified in this step)
- {file3}
- {file4}

## Progress Changes
- Step {N} status: {current} → pending
- Step {N} attempts: reset to 0
- Step {N} notes: cleared

═══════════════════════════════════════════════════════
⚠️ This cannot be undone. Proceed? (yes/no)
═══════════════════════════════════════════════════════
```

### 4. Require Explicit Confirmation

Do NOT proceed without user typing "yes" or confirming.

If user confirms, continue. Otherwise abort:
```
Rollback cancelled. No changes made.
```

### 5. Revert Changes

**For created files:**
```bash
rm {file}
```

**For modified files:**
Suggest using git:
```bash
git checkout -- {file}
```

Or if not using git, note that manual restoration may be needed.

### 6. Reset Progress

Update `{plan-dir}/progress.json`:
```json
{
  "steps[N-1].status": "pending",
  "steps[N-1].startedAt": null,
  "steps[N-1].completedAt": null,
  "steps[N-1].verificationPassed": null,
  "steps[N-1].attempts": 0,
  "steps[N-1].notes": "",
  "context.blockers": [] // remove step-related blockers
}
```

### 7. Update Context

Add to `{plan-dir}/context.md`:
```markdown
---
## Rollback - {date}

Step {N} was rolled back.
Reason: {user's reason if provided}

Files deleted: {list}
Files reverted: {list}

Ready to retry step {N}.
```

### 8. Confirm Completion

```
═══════════════════════════════════════════════════════
  ✅ ROLLBACK COMPLETE
═══════════════════════════════════════════════════════

Step {N} has been reset.

Files removed: {count}
Files reverted: {count}

## Next Steps
1. Review what went wrong
2. Adjust approach if needed
3. `/plan-next {NNN}` to retry step {N}

## If Problem Persists
- Check step specification for accuracy
- Review acceptance criteria
- Consider updating the plan
═══════════════════════════════════════════════════════
```

## Safety Notes

- Always require confirmation before destructive actions
- Log what was rolled back in context.md
- Suggest git checkout for file reversions when possible
- If unsure what changed, recommend manual review

## Quality Checklist

- [ ] User confirmed before proceeding
- [ ] All created files identified
- [ ] All modified files identified
- [ ] progress.json reset correctly
- [ ] context.md documents the rollback

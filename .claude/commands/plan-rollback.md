# Plan Rollback Command

You are rolling back changes from a failed step in an implementation plan. This is a recovery mechanism when:
- Implementation broke existing functionality
- Step cannot be completed and changes should be discarded
- Need to restart a step fresh

## Input
Plan identifier: $ARGUMENTS

## Process

### Step 1: Assess Current State
```bash
PLAN_DIR=$(ls -d .claude/plans/$ARGUMENTS* 2>/dev/null | head -1)
cat $PLAN_DIR/progress.json
```

Check:
- Current step status
- Files created in this step (from context)
- Files modified in this step (from context)
- Git status

### Step 2: Confirm Rollback
```
═══════════════════════════════════════════════════════════════
  ⚠️ ROLLBACK CONFIRMATION
═══════════════════════════════════════════════════════════════

You are about to rollback Step {N}: {Step Name}

## This Will:
- Discard changes to: {list of modified files}
- Delete files created: {list of created files}
- Reset step status to "pending"

## This Will NOT:
- Affect previous completed steps
- Change committed code (only uncommitted)
- Delete the step's prompt file

## Files Affected
### Will Be Reverted
{list with git diff summary}

### Will Be Deleted
{list of new files}

Proceed with rollback? (This action requires confirmation)
═══════════════════════════════════════════════════════════════
```

### Step 3: Execute Rollback

#### Revert Modified Files
```bash
# Get list of modified files from context
FILES_MODIFIED=$(cat $PLAN_DIR/context.md | grep "Files Modified" -A 20 | grep "^- " | sed 's/^- //')

# Revert each file
for file in $FILES_MODIFIED; do
  git checkout HEAD -- "$file"
done
```

#### Delete Created Files
```bash
# Get list of created files from context
FILES_CREATED=$(cat $PLAN_DIR/context.md | grep "Files Created" -A 20 | grep "^- " | sed 's/^- //')

# Delete each file (with confirmation)
for file in $FILES_CREATED; do
  rm -f "$file"
done
```

#### Reset Progress
Update progress.json:
```json
{
  "steps[N-1]": {
    "status": "pending",
    "startedAt": null,
    "completedAt": null,
    "verificationPassed": null,
    "attempts": {previous attempts + 1},
    "notes": "Rolled back at {timestamp}. Previous attempt notes: {old notes}"
  },
  "context.blockers": ["Step {N} rolled back - needs fresh attempt"]
}
```

### Step 4: Update Context
Add to context.md:
```markdown
---

## Rollback - {timestamp}

### Step Rolled Back
Step {N}: {Step Name}

### Reason
{User-provided or inferred reason}

### Files Reverted
- {file}: {what was reverted}

### Files Deleted
- {file}: {was created in this step}

### Notes for Retry
- {what went wrong}
- {what to try differently}

### Pre-Rollback State
{Description of what was attempted}
```

### Step 5: Report Completion
```
═══════════════════════════════════════════════════════════════
  ✅ ROLLBACK COMPLETE
═══════════════════════════════════════════════════════════════

Step {N} has been rolled back.

## Changes Reverted
- {file 1}
- {file 2}

## Files Deleted
- {file 1}

## Current State
- Plan: {Plan Name}
- Current Step: {N} (pending)
- Total Attempts: {N}

## Next Actions
1. Review what went wrong in context.md
2. Consider adjusting approach
3. Run `/plan-next $ARGUMENTS` to retry

## Alternative
If this step is proving problematic:
- Review the step specification
- Consider breaking into smaller steps
- Check if prerequisites are truly met
═══════════════════════════════════════════════════════════════
```

## Safety Checks

### Before Rollback
- [ ] Confirm plan identifier is correct
- [ ] Check there are actually changes to rollback
- [ ] Verify no committed changes will be affected
- [ ] Backup any work worth preserving

### Cannot Rollback If
- No uncommitted changes exist
- Step is already marked "pending"
- Files were committed (need git revert instead)

### Partial Rollback Warning
If some files have mixed changes (some from this step, some not):
```
⚠️ PARTIAL CHANGES DETECTED

{file} has changes from multiple sources.
Cannot automatically separate step changes.

Options:
1. Full revert (lose all changes)
2. Manual review (show diff)
3. Cancel rollback
```

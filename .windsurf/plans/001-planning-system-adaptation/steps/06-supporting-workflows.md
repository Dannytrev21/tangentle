# Step 6: Create Supporting Workflows

## Context
The supporting workflows provide plan management capabilities: checking status, re-running verification, and rolling back failed changes.

## Goal
Create the `/plan-status`, `/plan-verify`, and `/plan-rollback` workflows.

## Prerequisites
- Steps 1-5 completed (core system in place)

## High-Level Steps
1. Create `/plan-status` workflow
2. Create `/plan-verify` workflow
3. Create `/plan-rollback` workflow

## Detailed Requirements

### plan-status.md
Shows progress across one or all plans:
- List all plans with progress bars
- Show current step details
- Display blockers if any
- Show completion percentage

Input variations:
```
/plan-status          # All plans
/plan-status 001      # Specific plan
```

### plan-verify.md
Re-runs verification for current step:
- Load current step's acceptance criteria
- Run all verification commands
- Report pass/fail status
- Suggest fixes for failures

Input:
```
/plan-verify 001
```

### plan-rollback.md
Reverts changes from failed step:
- Read context.md for files changed
- Offer to revert specific files
- Reset step status to pending
- Clear blocked status

Input:
```
/plan-rollback 001
```

## Files to Create
- `.windsurf/workflows/plan-status.md`
- `.windsurf/workflows/plan-verify.md`
- `.windsurf/workflows/plan-rollback.md`

## Files to Modify
None

## Patterns to Follow
- Consistent output formatting
- Clear progress visualization
- Non-destructive by default (confirm before rollback)

## Acceptance Criteria
- [ ] `plan-status.md` created and invokable
- [ ] `plan-verify.md` created and invokable
- [ ] `plan-rollback.md` created and invokable
- [ ] All files under 12,000 characters
- [ ] Status shows progress visually
- [ ] Verify re-runs all acceptance criteria
- [ ] Rollback confirms before destructive action

## Verification Commands
```bash
# Check all files exist
ls -la .windsurf/workflows/plan-*.md

# Verify sizes
wc -c .windsurf/workflows/plan-*.md
```

## Documentation Updates
None yet - documentation step comes last.

## Error Recovery
If workflows don't work:
1. Verify files are in `.windsurf/workflows/`
2. Check for markdown formatting issues
3. Ensure plan directory exists for specific plan commands

## Do NOT
- Make rollback automatic (must confirm)
- Skip listing all acceptance criteria in verify
- Forget to handle "no plans exist" case in status

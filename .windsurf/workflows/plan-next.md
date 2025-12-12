# Plan Next

Execute the next step in an implementation plan with verification and progress tracking.

## Description

This workflow is the execution engine. It loads the current step's prompt, guides implementation, runs verification, handles success/failure, and updates progress.

## Steps

### 1. Locate and Validate Plan

```bash
PLAN_DIR=$(ls -d .windsurf/plans/$ARGUMENTS* 2>/dev/null | head -1)
```

If not found, list available plans and ask user to specify.

### 2. Load Current State

Read `{plan-dir}/progress.json` and extract:
- `currentStep` - The step number to execute
- `status` - Overall plan status
- `totalSteps` - Total steps in plan

If `currentStep` > `totalSteps`, plan is already complete.

### 3. Verify Prompts Exist

Check if prompts have been generated:
```bash
ls {plan-dir}/prompts/*.prompt.md 2>/dev/null | wc -l
```

If no prompts exist:
```
Prompts not yet generated.
Run `/plan-prompts {NNN}` first.
```

### 4. Load Context

Read `{plan-dir}/context.md` to understand:
- What's been completed
- Key decisions made
- Any blockers
- Things to remember

### 5. Display Step Summary

```
═══════════════════════════════════════════════════════
  PLAN: {Plan Name} ({NNN})
  STEP: {N} of {Total} - {Step Name}
═══════════════════════════════════════════════════════

## Previous Context
{Summary from context.md}

## This Step Will:
{Brief description}

Ready to proceed? Starting implementation...
═══════════════════════════════════════════════════════
```

### 6. Load and Execute Prompt

Read the prompt file:
```
{plan-dir}/prompts/{NN}-{step-name}.prompt.md
```

Follow the prompt exactly:
1. Complete Pre-Implementation checklist
2. Implement according to guide
3. Run all verification commands
4. Check all acceptance criteria

### 7. Handle Verification Results

**If ALL Acceptance Criteria Pass:**

Update `progress.json`:
```json
{
  "steps[N-1].status": "completed",
  "steps[N-1].completedAt": "{ISO date}",
  "steps[N-1].verificationPassed": true,
  "currentStep": N+1,
  "updatedAt": "{ISO date}"
}
```

Output success:
```
═══════════════════════════════════════════════════════
  ✅ STEP {N} COMPLETE
═══════════════════════════════════════════════════════

Progress: {N}/{Total} ({percentage}%)

Next: `/plan-next {NNN}`
═══════════════════════════════════════════════════════
```

**If Verification FAILS:**

Attempt self-correction (max 2 attempts):
1. Read the error message
2. Check error recovery section
3. Apply fix
4. Re-run verification

If still failing after 2 attempts:
```json
{
  "steps[N-1].status": "blocked",
  "steps[N-1].attempts": 2,
  "steps[N-1].notes": "{failure description}"
}
```

Output:
```
═══════════════════════════════════════════════════════
  ⚠️ STEP {N} NEEDS ATTENTION
═══════════════════════════════════════════════════════

Failed criteria: {list}

Options:
- `/plan-verify {NNN}` - Re-check after manual fix
- `/plan-rollback {NNN}` - Discard changes
═══════════════════════════════════════════════════════
```

### 8. Update Context

ALWAYS update `context.md` after a session:
```markdown
---
## Step {N} - {date}

### Result
{Completed / Blocked}

### What Was Done
{Summary}

### Files Changed
- Created: {list}
- Modified: {list}

### Learnings
{Any insights}

### Next
{What to do next}
```

### 9. Handle Plan Completion

If this was the last step and it passed:
```
═══════════════════════════════════════════════════════
  🎉 PLAN COMPLETE: {Plan Name}
═══════════════════════════════════════════════════════

All {N} steps completed successfully!

Files created: {count}
Files modified: {count}

Recommended:
1. Run full test suite
2. Manual QA testing
3. Code review
═══════════════════════════════════════════════════════
```

## Quality Checklist

- [ ] Prompt was followed exactly
- [ ] All verification commands run
- [ ] progress.json updated
- [ ] context.md updated
- [ ] No debug code left

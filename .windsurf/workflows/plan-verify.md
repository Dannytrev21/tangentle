# Plan Verify

Re-run verification for the current step in a plan.

## Description

Use this after making manual fixes to check if a blocked step can now proceed. Runs all acceptance criteria checks without re-implementing.

## Steps

### 1. Locate the Plan

```bash
PLAN_DIR=$(ls -d .windsurf/plans/$ARGUMENTS* 2>/dev/null | head -1)
```

If not found, list available plans.

### 2. Load Current State

Read `{plan-dir}/progress.json`:
- Get `currentStep`
- Get current step's status and details

If step status is "completed":
```
Step {N} is already complete.
Run `/plan-next {NNN}` to proceed to next step.
```

### 3. Load Step Definition

Read the step file:
```
{plan-dir}/steps/{NN}-{step-name}.md
```

Extract the Acceptance Criteria section.

### 4. Load Prompt Verification

Read the prompt file:
```
{plan-dir}/prompts/{NN}-{step-name}.prompt.md
```

Extract the Verification Protocol section.

### 5. Run All Verification Commands

For each verification command:
1. Display what's being checked
2. Run the command
3. Show output
4. Indicate pass/fail

```
═══════════════════════════════════════════════════════
  VERIFYING: Step {N} - {Step Name}
═══════════════════════════════════════════════════════

## Acceptance Criteria

1. {AC1}
   Command: {verification command}
   Result: ✅ PASS / ❌ FAIL
   Output: {actual output}

2. {AC2}
   Command: {verification command}
   Result: ✅ PASS / ❌ FAIL
   Output: {actual output}

...
═══════════════════════════════════════════════════════
```

### 6. Report Results

**If ALL Pass:**
```
═══════════════════════════════════════════════════════
  ✅ ALL VERIFICATIONS PASSED
═══════════════════════════════════════════════════════

Step {N} can now be marked complete.

Run `/plan-next {NNN}` to:
- Update progress
- Proceed to next step
═══════════════════════════════════════════════════════
```

**If ANY Fail:**
```
═══════════════════════════════════════════════════════
  ❌ VERIFICATION FAILED
═══════════════════════════════════════════════════════

Passed: {N} of {Total}
Failed: {list of failed criteria}

## Failed Criteria Details

### {AC that failed}
Expected: {what was expected}
Actual: {what happened}
Suggestion: {how to fix}

## Next Steps
1. Fix the failing criteria
2. Run `/plan-verify {NNN}` again
3. Or `/plan-rollback {NNN}` to start over
═══════════════════════════════════════════════════════
```

### 7. Update Progress Notes

If verification was run, update `progress.json`:
```json
{
  "steps[N-1].attempts": {increment by 1},
  "steps[N-1].notes": "Manual verify: {pass/fail count}"
}
```

## Quality Checklist

- [ ] All acceptance criteria checked
- [ ] Clear pass/fail for each
- [ ] Helpful suggestions for failures
- [ ] Progress.json updated with attempt

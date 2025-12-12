# Plan Verify Command

You are re-running verification for the current step of an implementation plan. This is useful when:
- Previous verification failed and you want to retry
- You made manual fixes and want to check them
- You want to ensure nothing regressed

## Input
Plan identifier: $ARGUMENTS

## Process

### Step 1: Locate Plan and Current Step
```bash
PLAN_DIR=$(ls -d .claude/plans/$ARGUMENTS* 2>/dev/null | head -1)
cat $PLAN_DIR/progress.json
```

Get the `currentStep` value and load that step's prompt.

### Step 2: Load Verification Section
From the prompt file, extract only the verification section:
- Acceptance Criteria
- Verification Commands

### Step 3: Run Each Verification
For each acceptance criterion:

```
═══════════════════════════════════════════════════════════════
  VERIFICATION: Step {N} - {Step Name}
═══════════════════════════════════════════════════════════════

## AC1: {Description}
Command: {command}
Expected: {expected}

Running...

Result: {actual output}
Status: ✅ PASS / ❌ FAIL

---

## AC2: {Description}
...
```

### Step 4: Summary Report

#### All Pass
```
═══════════════════════════════════════════════════════════════
  ✅ VERIFICATION PASSED
═══════════════════════════════════════════════════════════════

All {N} acceptance criteria passed.

## Results
✓ AC1: {description}
✓ AC2: {description}
✓ AC3: {description}

## Next Action
If this was a retry after fixes, run:
`/plan-next $ARGUMENTS`

This will:
1. Mark step as complete
2. Update progress tracking
3. Advance to next step
═══════════════════════════════════════════════════════════════
```

#### Some Fail
```
═══════════════════════════════════════════════════════════════
  ⚠️ VERIFICATION PARTIAL
═══════════════════════════════════════════════════════════════

{X} of {N} acceptance criteria passed.

## Results
✓ AC1: {description}
✗ AC2: {description}
  Error: {error details}
✓ AC3: {description}

## Failed Criterion Details
### AC2: {description}
**Command**: {command}
**Expected**: {expected}
**Actual**: {actual}

**Possible Causes**:
1. {cause 1}
2. {cause 2}

**Suggested Fixes**:
1. {fix 1}
2. {fix 2}

## Next Actions
1. Review the failed criterion
2. Apply suggested fix
3. Run `/plan-verify $ARGUMENTS` again
═══════════════════════════════════════════════════════════════
```

#### All Fail
```
═══════════════════════════════════════════════════════════════
  ❌ VERIFICATION FAILED
═══════════════════════════════════════════════════════════════

All {N} acceptance criteria failed.

## Results
✗ AC1: {description} - {error}
✗ AC2: {description} - {error}
✗ AC3: {description} - {error}

## Analysis
This likely indicates:
- Prerequisites not met
- Fundamental implementation issue
- Environment problem

## Recommended Actions
1. Check prerequisites:
   {prerequisite check commands}

2. Verify environment:
   {environment check commands}

3. Review implementation against spec:
   {relevant file paths}

4. Consider rollback if changes broke things:
   `/plan-rollback $ARGUMENTS`
═══════════════════════════════════════════════════════════════
```

### Step 5: Update Progress
After verification, update progress.json:

```json
{
  "steps[N-1].lastVerification": "{timestamp}",
  "steps[N-1].verificationPassed": {true/false},
  "steps[N-1].attempts": {increment}
}
```

## Verification Best Practices

### Command Verification
- Run exact command from prompt
- Capture both stdout and stderr
- Compare against expected output
- Consider timing for async operations

### State Verification
- Check file existence
- Verify file contents
- Test API endpoints
- Check database state (if applicable)

### Integration Verification
- Ensure new code works with existing
- Check for regressions
- Verify no circular dependencies
- Test error handling paths

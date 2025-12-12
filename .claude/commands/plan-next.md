# Plan Next Command

You are executing the next step in an implementation plan. This command handles:
1. Finding the current step
2. Loading the prompt
3. Executing the implementation
4. Verifying completion
5. Updating progress
6. Preparing context for next session

## Input
Plan identifier: $ARGUMENTS

## Process

### Step 1: Locate and Validate Plan
```bash
# Find the plan directory
PLAN_DIR=$(ls -d .claude/plans/$ARGUMENTS* 2>/dev/null | head -1)
```

If not found, list available plans:
```bash
ls -la .claude/plans/
```

### Step 2: Load Current State
Read the progress file:
```bash
cat $PLAN_DIR/progress.json
```

Extract:
- `currentStep` - The step number to execute
- `status` - Overall plan status
- `steps[currentStep-1]` - Current step details

### Step 3: Verify Prompts Exist
Check if prompts have been generated:
```bash
ls $PLAN_DIR/prompts/*.prompt.md 2>/dev/null | wc -l
```

If no prompts exist, inform user:
```
Prompts not yet generated for this plan.
Run `/plan-prompts $ARGUMENTS` first.
```

### Step 4: Load Context
Read accumulated context for continuity:
```bash
cat $PLAN_DIR/context.md
```

This provides:
- What's been completed
- Key decisions made
- Files created/modified
- Things to remember

### Step 5: Display Step Summary
Before starting, show:

```
═══════════════════════════════════════════════════════════════
  PLAN: {Plan Name} ({NNN})
  STEP: {N} of {Total} - {Step Name}
  STATUS: {Previous step status}
═══════════════════════════════════════════════════════════════

## Previous Context
{Summary from context.md}

## This Step Will:
{Brief description from step file}

## Prerequisites
{List of dependencies}

## Estimated Time: {estimate}

Ready to proceed? Starting implementation...
═══════════════════════════════════════════════════════════════
```

### Step 6: Load and Execute Prompt
Read the prompt file:
```bash
cat $PLAN_DIR/prompts/{NN}-{step-name}.prompt.md
```

Then execute the prompt contents:

1. **Pre-Implementation Checklist**
   - Read all required files
   - Verify prerequisites
   - Understand current state

2. **Implementation**
   - Follow step-by-step instructions
   - Apply patterns from examples
   - Handle edge cases

3. **Verification**
   - Run all verification commands
   - Check all acceptance criteria
   - Fix any failures

4. **Completion Protocol**
   - Update progress.json
   - Update context.md
   - Update documentation if required

### Step 7: Handle Verification Results

#### If ALL Acceptance Criteria Pass:

1. **Update progress.json**:
```javascript
// Read current progress
const progress = JSON.parse(fs.readFileSync('progress.json'));

// Update current step
progress.steps[currentStep - 1].status = 'completed';
progress.steps[currentStep - 1].completedAt = new Date().toISOString();
progress.steps[currentStep - 1].verificationPassed = true;
progress.steps[currentStep - 1].attempts = (progress.steps[currentStep - 1].attempts || 0) + 1;

// Advance to next step
progress.currentStep = currentStep + 1;
progress.updatedAt = new Date().toISOString();

// Update context
progress.context.filesCreated.push(...newFiles);
progress.context.filesModified.push(...modifiedFiles);
progress.context.learnings.push(anyLearnings);

// Check if plan complete
if (progress.currentStep > progress.totalSteps) {
  progress.status = 'completed';
}

fs.writeFileSync('progress.json', JSON.stringify(progress, null, 2));
```

2. **Update context.md**:
Add a new section:
```markdown
---

## Step {N} Complete - {timestamp}

### Summary
{What was accomplished}

### Files Created
- `{path}`: {purpose}

### Files Modified
- `{path}`: {what changed}

### Verification Results
- [x] {AC1}: Passed
- [x] {AC2}: Passed
- [x] {AC3}: Passed

### Key Decisions
- {decision made}: {rationale}

### Learnings
- {anything learned}

### Ready for Next Step
Step {N+1}: {Next step name}
Prerequisites met: {yes/no}
```

3. **Output Success**:
```
═══════════════════════════════════════════════════════════════
  ✅ STEP {N} COMPLETE
═══════════════════════════════════════════════════════════════

## Verification Results
✓ {AC1}
✓ {AC2}
✓ {AC3}

## Files Changed
Created: {list}
Modified: {list}

## Progress
{N}/{Total} steps complete ({percentage}%)
{visual progress bar}

## Next Step
Step {N+1}: {Next step name}

Run `/plan-next $ARGUMENTS` to continue.
═══════════════════════════════════════════════════════════════
```

#### If Verification PARTIALLY Passes:

1. **Identify Specific Failures**
```
## Verification Results
✓ {AC1}: Passed
✗ {AC2}: FAILED - {reason}
✓ {AC3}: Passed
```

2. **Attempt Self-Correction**
For each failure:
- Read the error message
- Check error recovery section in prompt
- Apply appropriate fix
- Re-run verification

3. **If Fix Succeeds**
Continue with completion protocol.

4. **If Fix Fails After 2 Attempts**
```
═══════════════════════════════════════════════════════════════
  ⚠️ STEP {N} NEEDS ATTENTION
═══════════════════════════════════════════════════════════════

## What Worked
✓ {AC1}
✓ {AC3}

## What Failed
✗ {AC2}
  Error: {error message}
  Attempted fixes:
  1. {fix 1} - {result}
  2. {fix 2} - {result}

## Recommended Actions
1. Review the error in detail
2. Check if spec needs adjustment
3. Manual debugging may be needed

## Progress Saved
Current state has been preserved in:
- progress.json (step marked as 'blocked')
- context.md (failure details recorded)

Resume with `/plan-next $ARGUMENTS` after fixing.
═══════════════════════════════════════════════════════════════
```

Update progress.json:
```json
{
  "steps[N-1].status": "blocked",
  "steps[N-1].attempts": 2,
  "steps[N-1].notes": "Failed verification: {specific failure}",
  "context.blockers": ["Step {N}: {failure description}"]
}
```

#### If ALL Verification Fails:

1. **Do NOT mark any progress**
2. **Document the failure thoroughly**
3. **Preserve all state for debugging**

```
═══════════════════════════════════════════════════════════════
  ❌ STEP {N} FAILED
═══════════════════════════════════════════════════════════════

## All Verifications Failed
✗ {AC1}: {error}
✗ {AC2}: {error}
✗ {AC3}: {error}

## Possible Causes
1. Prerequisites not met
2. Spec misunderstood
3. Breaking change in dependencies

## State Preserved
No changes committed. Working state in:
- {files with changes}

## Recovery Options
1. `/plan-verify $ARGUMENTS` - Re-run verification only
2. `/plan-rollback $ARGUMENTS` - Discard changes
3. Manual review and fix

## Debug Information
{Relevant error logs}
{State of affected files}
═══════════════════════════════════════════════════════════════
```

### Step 8: Prepare for Next Session
Always update context.md with session summary, even on failure:

```markdown
---

## Session End - {timestamp}

### Work Attempted
Step {N}: {Step name}

### Result
{Completed / Partial / Failed}

### Current State
{Description of where things stand}

### To Resume
1. Read this context.md
2. Run `/plan-next $ARGUMENTS`
3. {Any specific instructions}

### Files in Progress
{List of files being worked on}

### Known Issues
{Any issues to be aware of}
```

## Special Cases

### First Step of Plan
If `currentStep === 1`:
- Set `status: "in_progress"` in progress.json
- Create initial context.md content
- Verify all prerequisites from plan.md

### Last Step of Plan
If `currentStep === totalSteps` and verification passes:
- Set `status: "completed"` in progress.json
- Generate completion summary
- Suggest follow-up actions

```
═══════════════════════════════════════════════════════════════
  🎉 PLAN COMPLETE: {Plan Name}
═══════════════════════════════════════════════════════════════

## Summary
- Started: {date}
- Completed: {date}
- Duration: {time}
- Steps: {N} of {N} complete

## Files Created
{list}

## Files Modified
{list}

## Documentation Updated
{list}

## Key Achievements
{from context.md learnings}

## Recommended Follow-ups
1. Run full test suite
2. Manual QA testing
3. Code review
4. Update related documentation
═══════════════════════════════════════════════════════════════
```

### Resuming After Compact/New Session
If context.md exists with recent session data:
1. Display previous session summary
2. Show what was in progress
3. Verify state before continuing
4. Resume from last known good state

## Quality Assurance

### Before Each Step
- [ ] Prerequisites verified
- [ ] Required files read
- [ ] Context loaded

### During Implementation
- [ ] Following established patterns
- [ ] Handling edge cases
- [ ] No debug code left

### After Each Step
- [ ] All AC verified
- [ ] Progress updated
- [ ] Context updated
- [ ] Ready for next step

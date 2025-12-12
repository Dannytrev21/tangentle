# Step 5: Create Plan-Next Workflow

## Context
The `/plan-next` workflow is the execution engine of the planning system. It loads the next step's prompt, guides implementation, runs verification, and updates progress.

## Goal
Create a workflow that executes the next pending step in a plan, with verification and self-correction.

## Prerequisites
- Step 1 completed (directory structure exists)
- Step 2 completed (rules provide context)
- Step 3 completed (plan-feature creates plans)
- Step 4 completed (plan-prompts generates prompts to execute)

## High-Level Steps
1. Locate and validate plan
2. Load current state from progress.json
3. Verify prompts exist
4. Load context from context.md
5. Display step summary
6. Load and execute the step's prompt
7. Run verification
8. Handle results (success/partial/failure)
9. Update progress and context

## Detailed Requirements

### Workflow Structure
```markdown
# Plan Next

## Description
Execute the next step in an implementation plan...

## Steps
1. Locate plan directory
2. Read progress.json
3. Verify prompts generated
4. Load context.md
5. Display step info
6. Execute step prompt
7. Verify completion
8. Update progress
9. Prepare for next session
```

### State Machine
```
not_started → in_progress → completed
                    ↓
              blocked (after 2 failed attempts)
```

### Verification Handling
- **All pass**: Mark complete, advance step
- **Partial pass**: Attempt self-correction (2 tries)
- **All fail**: Mark blocked, preserve state

### Progress Updates
On success:
```json
{
  "steps[N-1].status": "completed",
  "steps[N-1].completedAt": "ISO-date",
  "steps[N-1].verificationPassed": true,
  "currentStep": N+1
}
```

## Files to Create
- `.windsurf/workflows/plan-next.md`

## Files to Modify
None

## Patterns to Follow
From the original system:
- Always update context.md, even on failure
- Preserve state for debugging
- Clear output formatting for results
- Maximum 2 self-correction attempts

## Acceptance Criteria
- [ ] Workflow file created at `.windsurf/workflows/plan-next.md`
- [ ] File under 12,000 characters
- [ ] Workflow invokable via `/plan-next`
- [ ] Loads correct step prompt
- [ ] Runs verification after implementation
- [ ] Updates progress.json correctly
- [ ] Updates context.md with session summary
- [ ] Handles completion of final step

## Verification Commands
```bash
# Check file exists and size
ls -la .windsurf/workflows/plan-next.md
wc -c .windsurf/workflows/plan-next.md

# Verify markdown structure
head -100 .windsurf/workflows/plan-next.md
```

## Documentation Updates
None yet - documentation step comes last.

## Error Recovery
If step execution fails:
1. Check prerequisite steps are complete
2. Verify prompt file exists
3. Review verification output
4. Check context.md for state information

## Do NOT
- Skip verification
- Mark complete without all criteria passing
- Exceed 2 self-correction attempts
- Forget context.md updates

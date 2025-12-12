# Prompt: Step {N} - {Step Name}

## 1. Mission
{One clear sentence describing what to accomplish in this step}

## 2. Context

You are implementing step {N} of {total} in the "{Plan Name}" plan.

**Plan Summary**: {Brief description of the overall plan}

**This Step**: {Why this step matters and what it enables}

**Dependencies**:
- Requires: {Previous steps that must be complete}
- Enables: {Steps that depend on this one}

## 3. Pre-Implementation Checklist

Before writing any code, complete these steps:

### Read Required Files
| File | Why | Focus On |
|------|-----|----------|
| `{path}` | {reason} | Lines {X-Y}: {what to look for} |
| `{path}` | {reason} | Lines {X-Y}: {what to look for} |

### Verify Prerequisites
```bash
# Check that required files exist
{verification command}

# Check that previous steps are complete
cat .windsurf/plans/{NNN}-{slug}/progress.json | grep currentStep
```

### Understand Current State
```bash
# Read plan context
cat .windsurf/plans/{NNN}-{slug}/context.md
```

## 4. Specification

### Goal
{Detailed description of what to build}

### Requirements
1. {Requirement 1}
2. {Requirement 2}
3. {Requirement 3}

### Expected Structure
```
{Expected file/code structure}
```

### Interface (if applicable)
```javascript
// Expected interface
{interface definition}
```

## 5. Implementation Guide

### Step-by-Step Instructions

1. **{Action 1}**
   - {Detail}
   - {Detail}

2. **{Action 2}**
   - {Detail}
   - {Detail}

3. **{Action 3}**
   - {Detail}
   - {Detail}

### Patterns to Follow
From `{file}` (lines {X-Y}):
```javascript
{code example}
```

Follow this pattern because: {rationale}

### Edge Cases
- {Edge case 1}: {how to handle}
- {Edge case 2}: {how to handle}

## 6. Acceptance Criteria

All must pass before marking complete:

- [ ] **AC1**: {criterion}
  - Verify: `{command}`
  - Expected: {expected result}

- [ ] **AC2**: {criterion}
  - Verify: `{command}`
  - Expected: {expected result}

- [ ] **AC3**: {criterion}
  - Verify: `{command}`
  - Expected: {expected result}

## 7. Verification Protocol

### Syntax Check
```bash
{command}
```
Expected: No errors

### Unit Tests
```bash
{command}
```
Expected: All tests pass

### Integration Check
```bash
{command}
```
Expected: {expected behavior}

### Manual Verification
```bash
{command}
```
Check that: {what to verify}

## 8. Error Recovery

### If Syntax Check Fails
1. Read the error message
2. Check for: missing imports, typos, unclosed brackets
3. Fix and re-run

### If Tests Fail
1. Read test output
2. Check implementation against spec
3. Fix implementation or update test if spec changed

### If Integration Fails
1. Check dependencies are correctly imported
2. Verify interface matches expected contract
3. Review error logs

## 9. Completion Protocol

After ALL acceptance criteria pass:

### Update Progress
Edit `.windsurf/plans/{NNN}-{slug}/progress.json`:
```json
{
  "steps[{N-1}]": {
    "status": "completed",
    "completedAt": "{ISO date}",
    "verificationPassed": true
  },
  "currentStep": {N+1}
}
```

### Update Context
Add to `.windsurf/plans/{NNN}-{slug}/context.md`:
```markdown
## Step {N} Complete - {date}

### What Was Done
{Summary}

### Files Created/Modified
- `{path}`: {purpose}

### Learnings
- {what was learned}
```

## 10. Do NOT
- Skip reading required files first
- Implement beyond this step's scope
- Ignore failing tests
- Forget to update progress.json
- Leave debugging code
- Mark complete until ALL criteria pass

## Quality Checklist
- [ ] All acceptance criteria verified
- [ ] Code follows existing patterns
- [ ] No console.log/debug statements
- [ ] Error handling appropriate
- [ ] progress.json updated
- [ ] context.md updated

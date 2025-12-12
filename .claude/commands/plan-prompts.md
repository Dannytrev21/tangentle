# Plan Prompts Command

You are generating optimized AI prompts for each step in an implementation plan. These prompts will enable an AI agent to implement each step with high quality and self-correction capability.

## Input
Plan identifier: $ARGUMENTS

## Process

### Step 1: Locate the Plan
Find the plan directory:
```bash
ls -d .claude/plans/$ARGUMENTS* 2>/dev/null | head -1
```

If not found, list available plans and ask user to specify.

### Step 2: Read Plan Context
Read these files to understand the plan:
1. `{plan-dir}/plan.md` - Overall plan
2. `{plan-dir}/adr.md` - Architectural decisions
3. `{plan-dir}/progress.json` - Current state
4. `{plan-dir}/steps/*.md` - All step files

### Step 3: Create Prompts Directory
```bash
mkdir -p {plan-dir}/prompts
```

### Step 4: Generate Prompt for Each Step
For each step file in `{plan-dir}/steps/`, create a corresponding prompt file in `{plan-dir}/prompts/`.

Use this optimized prompt template:

```markdown
# Prompt: Step {N} - {Step Name}

## Mission
{One clear sentence describing what to accomplish}

## Context
You are implementing step {N} of {total} in the "{Plan Name}" plan.

**Plan Summary**: {Brief description of overall plan}

**This Step**: {Why this step matters and what it enables}

**Dependencies**:
- Requires: {Previous steps that must be complete}
- Enables: {Steps that depend on this one}

## Pre-Implementation Checklist
Before writing any code, complete these steps:

### 1. Read Required Files
Read these files to understand existing patterns:

| File | Why | Focus On |
|------|-----|----------|
| `{path}` | {reason} | Lines {X-Y}: {what to look for} |

### 2. Verify Prerequisites
```bash
# Check that required files/services exist
{verification commands}
```

### 3. Understand Current State
Read the plan context:
```bash
cat {plan-dir}/context.md
cat {plan-dir}/progress.json | jq '.context'
```

## Specification

### Goal
{Detailed description of what to build}

### Requirements
{Numbered list of specific requirements}

### Code Structure
```
{Expected file/code structure}
```

### API/Interface (if applicable)
```javascript
// Expected interface
{interface definition}
```

## Implementation Guide

### Step-by-Step Instructions
1. **{Action 1}**
   - {Detail}
   - {Detail}

2. **{Action 2}**
   - {Detail}
   - {Detail}

### Patterns to Follow
From `{file}` (lines {X-Y}):
```javascript
{code example}
```

Follow this pattern because: {rationale}

### Edge Cases to Handle
- {Edge case 1}: {how to handle}
- {Edge case 2}: {how to handle}

## Acceptance Criteria
All must pass before marking complete:

- [ ] **AC1**: {criterion}
  - Verify: `{command}`

- [ ] **AC2**: {criterion}
  - Verify: `{command}`

- [ ] **AC3**: {criterion}
  - Verify: `{command}`

## Verification Protocol

### 1. Syntax Check
```bash
# Verify no syntax errors
{command}
```
Expected: {expected output}

### 2. Unit Test
```bash
# Run relevant tests
{command}
```
Expected: All tests pass

### 3. Integration Check
```bash
# Verify integration with existing code
{command}
```
Expected: {expected behavior}

### 4. Manual Verification
```bash
# Commands to manually test
{command}
```
Check that: {what to verify}

## Error Recovery

### If Syntax Check Fails
1. Read the error message carefully
2. Check for common issues:
   - Missing imports
   - Typos in variable names
   - Unclosed brackets/quotes
3. Fix and re-run

### If Tests Fail
1. Read test output to identify failing test
2. Check if implementation matches spec
3. Verify test expectations are correct
4. Fix implementation or update test if spec changed

### If Integration Fails
1. Check that dependencies are correctly imported
2. Verify interface matches expected contract
3. Check for circular dependencies
4. Review error logs for specific failure

### If Verification Partially Passes
1. Document what works in context.md
2. Note specific failure in progress.json
3. Create minimal fix rather than rewriting
4. Re-run verification after fix

## Completion Protocol

After ALL acceptance criteria pass:

### 1. Update Progress
Update `{plan-dir}/progress.json`:
```json
{
  "steps[{N-1}]": {
    "status": "completed",
    "completedAt": "{ISO date}",
    "verificationPassed": true,
    "notes": "{any relevant notes}"
  },
  "currentStep": {N+1},
  "context.filesCreated": [..., "{new files}"],
  "context.filesModified": [..., "{modified files}"]
}
```

### 2. Update Context
Add to `{plan-dir}/context.md`:
```markdown
## Step {N} Complete - {date}

### What Was Done
{Summary of implementation}

### Files Created
- `{path}`: {purpose}

### Files Modified
- `{path}`: {what changed}

### Key Decisions
- {decision}: {rationale}

### Learnings
- {what was learned}
```

### 3. Update Documentation (if required)
{Specific documentation updates for this step}

### 4. Commit Changes
```bash
git add {files}
git commit -m "{commit message template}"
```

## Do NOT
- Do NOT skip reading required files first
- Do NOT implement beyond this step's scope
- Do NOT ignore failing tests
- Do NOT forget to update progress.json
- Do NOT leave debugging code
- Do NOT skip documentation updates
- Do NOT mark complete until ALL criteria pass

## Quality Checklist
Before marking complete, verify:
- [ ] All acceptance criteria pass
- [ ] Code follows existing patterns
- [ ] No console.log/debug statements left
- [ ] Error handling is appropriate
- [ ] Documentation is updated
- [ ] progress.json is updated
- [ ] context.md is updated
```

### Step 5: Customize Each Prompt
For each step, customize the template with:

1. **Specific file paths** - Use actual paths from the codebase
2. **Line numbers** - Reference specific lines in existing files
3. **Code examples** - Include relevant patterns from the codebase
4. **Exact commands** - Copy-pasteable verification commands
5. **Real acceptance criteria** - From the step definition

### Step 6: Update progress.json
Mark prompts as generated:
```json
{
  "steps[N].promptGenerated": true
}
```

### Step 7: Output Summary

```
## Prompts Generated for Plan {NNN}

**Plan**: {Plan Name}
**Prompts Created**: {N} prompts in .claude/plans/{NNN}-{slug}/prompts/

### Prompt Files
| Step | File | Ready |
|------|------|-------|
| 1 | 01-{name}.prompt.md | Yes |
| 2 | 02-{name}.prompt.md | Yes |
| ... | ... | ... |

### Next Command
`/plan-next {NNN}` - Start implementing step 1

### Manual Usage
To run a specific step manually:
1. Open `.claude/plans/{NNN}-{slug}/prompts/{NN}-{name}.prompt.md`
2. Copy the entire content
3. Paste to a new Claude Code session
```

## Prompt Quality Standards

### Context Completeness
Every prompt must be executable with ZERO prior context:
- All file paths must be absolute or clearly relative to project root
- All code patterns must be included inline
- All commands must be copy-pasteable
- No references to "previous discussion"

### Verification Rigor
Every acceptance criterion must have:
- Clear pass/fail definition
- Specific command to verify
- Expected output described

### Self-Correction Capability
Every prompt must include:
- Common failure modes
- How to diagnose each failure
- How to recover from each failure
- When to escalate vs. retry

### Progress Integration
Every prompt must include:
- How to update progress.json
- How to update context.md
- What to commit
- How to prepare for next step

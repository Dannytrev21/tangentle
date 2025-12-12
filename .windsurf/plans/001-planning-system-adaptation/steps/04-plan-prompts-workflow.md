# Step 4: Create Plan-Prompts Workflow

## Context
The `/plan-prompts` workflow generates AI-optimized prompts for each step in a plan. These prompts enable Cascade to implement steps with self-correction capability.

## Goal
Create a workflow that generates detailed, self-contained prompts for each step in an existing plan.

## Prerequisites
- Step 1 completed (directory structure exists)
- Step 2 completed (rules provide context)
- Step 3 completed (plan-feature creates plans to generate prompts for)

## High-Level Steps
1. Create the workflow file
2. Accept plan identifier as input
3. Read plan context (plan.md, adr.md, steps/*.md)
4. Generate prompt for each step using template
5. Update progress.json with promptGenerated flags

## Detailed Requirements

### Workflow Structure
```markdown
# Plan Prompts

## Description
Generate optimized AI prompts for each step in an implementation plan...

## Steps
1. Locate the plan directory
2. Read plan context files
3. Create prompts directory if needed
4. For each step, generate a prompt file
5. Update progress.json
6. Output summary
```

### Prompt Generation
Each prompt should include:
- Mission (clear objective)
- Context (dependencies, why it matters)
- Pre-Implementation checklist
- Specification (detailed requirements)
- Implementation guide
- Acceptance criteria
- Verification commands
- Error recovery procedures
- Completion protocol

### Input Handling
```
/plan-prompts 001
/plan-prompts planning-system
```

## Files to Create
- `.windsurf/workflows/plan-prompts.md`

## Files to Modify
None

## Patterns to Follow
From the original system:
- Prompts must be self-contained (zero prior context needed)
- All file paths must be absolute or clearly relative
- Verification commands must be copy-pasteable
- Include error recovery for common failures

## Acceptance Criteria
- [ ] Workflow file created at `.windsurf/workflows/plan-prompts.md`
- [ ] File under 12,000 characters
- [ ] Workflow invokable via `/plan-prompts`
- [ ] Generates prompts in `{plan-dir}/prompts/` directory
- [ ] Updates progress.json with promptGenerated flags
- [ ] References prompt template

## Verification Commands
```bash
# Check file exists and size
ls -la .windsurf/workflows/plan-prompts.md
wc -c .windsurf/workflows/plan-prompts.md

# Verify markdown structure
head -100 .windsurf/workflows/plan-prompts.md
```

## Documentation Updates
None yet - documentation step comes last.

## Error Recovery
If prompts aren't generated correctly:
1. Verify plan directory exists
2. Check step files exist in `steps/` directory
3. Verify prompts directory is created
4. Check for write permissions

## Do NOT
- Generate prompts that require prior context
- Skip any step from the plan
- Forget to update progress.json
- Exceed 12,000 character limit

# Step 3: Create Plan-Feature Workflow

## Context
The `/plan-feature` workflow is the primary entry point for creating new implementation plans. It guides Cascade through analyzing a feature request, applying Tree of Thought analysis, and creating the full plan structure.

## Goal
Create a workflow that replicates the functionality of `.claude/commands/plan-feature.md` in Windsurf's workflow format.

## Prerequisites
- Step 1 completed (directory structure exists)
- Step 2 completed (rules provide context)

## High-Level Steps
1. Create the workflow file in `.windsurf/workflows/`
2. Reference the plan template from `.windsurf/templates/`
3. Include step-by-step instructions for Cascade
4. Stay within 12,000 character limit

## Detailed Requirements

### Workflow Structure
```markdown
# Plan Feature

## Description
Create a comprehensive implementation plan for a new feature...

## Steps
1. Analyze feature request
2. Determine plan number
3. Create plan directory
4. Apply Tree of Thought analysis
5. Create plan.md
6. Create adr.md
7. Create step files
8. Create progress.json and context.md
9. Output summary
```

### Key Functionality
- Accepts feature description as input
- Reads project context (existing patterns, conventions)
- Applies ToT analysis for major decisions
- Creates structured plan directory
- Initializes progress tracking

### Input Handling
Workflow should work with feature description provided after the command:
```
/plan-feature Build a user authentication system with OAuth support
```

## Files to Create
- `.windsurf/workflows/plan-feature.md`

## Files to Modify
None

## Patterns to Follow
From Windsurf docs:
- Sequential steps that Cascade follows
- Clear, actionable instructions
- Can reference other workflows
- Can reference template files

## Acceptance Criteria
- [ ] Workflow file created at `.windsurf/workflows/plan-feature.md`
- [ ] File under 12,000 characters
- [ ] Workflow invokable via `/plan-feature`
- [ ] Creates correct directory structure when run
- [ ] Includes ToT analysis guidance
- [ ] References templates for plan content

## Verification Commands
```bash
# Check file exists and size
ls -la .windsurf/workflows/plan-feature.md
wc -c .windsurf/workflows/plan-feature.md

# Verify markdown structure
head -100 .windsurf/workflows/plan-feature.md
```

## Documentation Updates
None yet - documentation step comes last.

## Error Recovery
If workflow doesn't invoke:
1. Verify file is in `.windsurf/workflows/` directory
2. Check filename matches expected pattern
3. Ensure file is valid markdown
4. Check for syntax errors

## Do NOT
- Exceed 12,000 characters
- Include implementation code (workflow guides, doesn't implement)
- Skip Tree of Thought analysis section
- Forget progress.json initialization

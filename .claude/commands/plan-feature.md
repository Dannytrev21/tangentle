# Plan Feature Command

You are creating a comprehensive implementation plan for a new feature. This plan will guide AI agents through high-quality implementation with self-correction capabilities.

## Input
Feature description: $ARGUMENTS

## Process

### Step 1: Analyze the Feature Request
First, thoroughly understand what's being requested:
1. Read `CLAUDE.md` for project context and conventions
2. Explore the codebase to understand existing patterns
3. Identify affected files and systems

### Step 2: Determine Plan Number
Check existing plans and get next number:
```bash
ls -d .claude/plans/[0-9]* 2>/dev/null | sort -V | tail -1
```
If no plans exist, start with 001. Otherwise increment.

### Step 3: Create Plan Directory
Create: `.claude/plans/{NNN}-{feature-slug}/`

With structure:
```
.claude/plans/{NNN}-{feature-slug}/
├── plan.md           # Main plan document
├── adr.md            # Architecture Decision Record
├── steps/            # Individual step files
├── prompts/          # AI prompts (created by /plan-prompts)
├── progress.json     # Machine-readable state
└── context.md        # Accumulated context
```

### Step 4: Apply Tree of Thought Analysis
For each major decision in the feature, document:

```markdown
### Decision: {Topic}

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | ... | ... | ... |
| B | ... | ... | ... |
| C | ... | ... | ... |

**Selected: Option {X}** - {Rationale}
```

Consider at minimum:
- Data storage approach
- API design
- UI/UX approach
- Integration strategy
- Testing approach

### Step 5: Create plan.md
Use this template:

```markdown
# Plan {NNN}: {Feature Name}

## Overview
{2-3 sentence description of the feature and its value}

## Status
- **Created**: {date}
- **Status**: Not Started
- **Current Step**: 0 of {N}

## Tree of Thought Analysis

### What are we building?
{Detailed description}

### Why are we building it?
{Business/user value}

### Key Decisions
{Tree of Thought analysis for each major decision}

## Implementation Steps

| Step | Name | Description | Status |
|------|------|-------------|--------|
| 1 | {name} | {description} | Pending |
| 2 | {name} | {description} | Pending |
| ... | ... | ... | ... |

## Files to Create
- {path}: {description}

## Files to Modify
- {path}: {what changes}

## Dependencies
- {step X depends on step Y}

## Success Criteria
- [ ] {criterion 1}
- [ ] {criterion 2}

## Rollback Plan
{How to undo if things go wrong}
```

### Step 6: Create adr.md
Document the architectural decisions:

```markdown
# ADR: {Feature Name}

## Status
Proposed

## Context
{Why this feature is needed}

## Tree of Thought Analysis
{All major decisions with options considered}

## Decision
{Summary of selected approach}

## Consequences
### Positive
- {benefit 1}

### Negative
- {tradeoff 1}

### Mitigations
- {how to address negatives}
```

### Step 7: Create Individual Step Files
For each implementation step, create `.claude/plans/{NNN}-{slug}/steps/{NN}-{step-name}.md`:

```markdown
# Step {N}: {Step Name}

## Context
{Why this step is needed, what it builds on}

## Goal
{Clear, measurable objective}

## Prerequisites
- Step {X} completed
- {other requirements}

## High-Level Steps
1. {step 1}
2. {step 2}
3. {step 3}

## Detailed Requirements
{Specific implementation details}

## Files to Create
- `{path}`: {description}

## Files to Modify
- `{path}`: {what to change}

## Patterns to Follow
Reference: `{existing file}` lines {X-Y}

## Acceptance Criteria
- [ ] {criterion 1}
- [ ] {criterion 2}
- [ ] {criterion 3}

## Verification Commands
```bash
# Command 1: {description}
{command}

# Command 2: {description}
{command}
```

## Documentation Updates
- [ ] Update `{file}`: {what to add}

## Error Recovery
If verification fails:
1. {recovery step 1}
2. {recovery step 2}

## Do NOT
- {common mistake 1}
- {common mistake 2}
```

### Step 8: Create progress.json

```json
{
  "planId": "{NNN}",
  "name": "{feature-slug}",
  "title": "{Feature Name}",
  "description": "{Brief description}",
  "createdAt": "{ISO date}",
  "updatedAt": "{ISO date}",
  "status": "not_started",
  "currentStep": 0,
  "totalSteps": {N},
  "steps": [
    {
      "id": 1,
      "name": "{step-slug}",
      "title": "{Step Title}",
      "status": "pending",
      "promptGenerated": false,
      "startedAt": null,
      "completedAt": null,
      "verificationPassed": null,
      "attempts": 0,
      "notes": ""
    }
  ],
  "context": {
    "filesCreated": [],
    "filesModified": [],
    "keyDecisions": [],
    "blockers": [],
    "learnings": []
  }
}
```

### Step 9: Create context.md

```markdown
# Plan {NNN} Context

This file maintains context for resuming work on this plan from a fresh terminal or after conversation compacting.

## Quick Status
- **Plan**: {Feature Name}
- **Current Step**: {N} - {Step Name}
- **Last Updated**: {date/time}

## What's Been Done
{Summary of completed work}

## Files Created
| File | Purpose |
|------|---------|

## Files Modified
| File | Changes |
|------|---------|

## Key Decisions Made
1. {Decision 1}: {rationale}

## Current State
{Description of where things are}

## Next Actions
1. {What to do next}

## Things to Remember
- {Important context 1}
- {Important context 2}

## Blockers
{Any current blockers}

## Learnings
{What we've learned during implementation}
```

### Step 10: Output Summary
After creating all files, output:

```
## Plan Created: {NNN}-{feature-slug}

**Feature**: {Feature Name}
**Steps**: {N} implementation steps
**Location**: .claude/plans/{NNN}-{feature-slug}/

### Files Created
- plan.md - Main plan document
- adr.md - Architecture decisions
- steps/ - {N} step files
- progress.json - Progress tracking
- context.md - Context preservation

### Next Commands
1. `/plan-prompts {NNN}` - Generate AI prompts for each step
2. `/plan-next {NNN}` - Start implementing first step
3. `/plan-status {NNN}` - Check progress anytime
```

## Quality Standards

### For Steps
- Each step should be completable in one focused session (30-90 minutes)
- Steps should have clear, testable acceptance criteria
- Dependencies between steps must be explicit
- Verification commands must be copy-pasteable

### For Tree of Thought
- Consider at least 3 options for each major decision
- Document pros/cons objectively
- Explain rationale for selection
- Consider long-term maintainability

### For Context Preservation
- Write as if explaining to someone with no prior context
- Include specific file paths and line numbers
- Document "why" not just "what"
- Update after every significant change

Constraints: 
- DO NOT Begin working on any of the next prompts or implementing this before the plan-prompts has been called. This is just for the setup and plan. Actual implementation step will begin after. 

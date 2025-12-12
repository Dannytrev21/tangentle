# Planning System Rules

> **Activation**: Always On

## Overview

This project uses an automated planning system for implementing complex features. The system is located in `.windsurf/` and provides structured feature planning with Tree of Thought analysis, progress tracking, and self-correction.

## Available Workflows

| Command | Purpose |
|---------|---------|
| `/plan-feature {description}` | Create new implementation plan |
| `/plan-prompts {plan#}` | Generate AI prompts for each step |
| `/plan-next {plan#}` | Execute next step in plan |
| `/plan-status {plan#}` | Check progress (omit # for all plans) |
| `/plan-verify {plan#}` | Re-run verification for current step |
| `/plan-rollback {plan#}` | Rollback failed step changes |

## Directory Structure

```
.windsurf/
├── rules/        # Behavior rules (this file)
├── workflows/    # Planning command workflows
├── templates/    # Reusable plan templates
└── plans/        # Plan storage
    └── {NNN}-{slug}/
        ├── plan.md
        ├── adr.md
        ├── steps/
        ├── prompts/
        ├── progress.json
        └── context.md
```

## Progress Tracking

Plans track progress in two files:
- `progress.json` - Machine-readable state (current step, status, attempts)
- `context.md` - Human-readable context (decisions, learnings, blockers)

## Key Principles

1. **Tree of Thought**: Every major decision considers 3+ options with pros/cons
2. **Self-Contained Prompts**: Each step prompt works without prior context
3. **Verification Required**: All acceptance criteria must pass before completing
4. **Self-Correction**: Up to 2 automatic fix attempts before marking blocked
5. **Context Preservation**: Always update context.md after working on a plan

## When Working on Plans

- Read `progress.json` to understand current state
- Read `context.md` for decisions and learnings
- Follow prompts in `prompts/` directory exactly
- Update both files after making progress
- Don't skip verification steps

# Windsurf Planning System

An automated planning system for implementing complex features with high code quality and self-correction capabilities.

## Quick Start

```bash
# 1. Create a new plan
/plan-feature Build a user authentication system

# 2. Generate prompts for each step
/plan-prompts 001

# 3. Execute steps one by one
/plan-next 001
```

## Available Commands

| Command | Description |
|---------|-------------|
| `/plan-feature {description}` | Create a new implementation plan |
| `/plan-prompts {plan#}` | Generate AI prompts for each step |
| `/plan-next {plan#}` | Execute next step in plan |
| `/plan-status {plan#}` | Check progress (omit # for all) |
| `/plan-verify {plan#}` | Re-run verification |
| `/plan-rollback {plan#}` | Rollback failed changes |

## Directory Structure

```
.windsurf/
├── rules/              # Behavior rules for Cascade
│   ├── planning-system.md    # Core planning context (always-on)
│   ├── plan-file-editing.md  # Context when editing plans (glob)
│   └── quality-standards.md  # Code quality standards (always-on)
│
├── workflows/          # Planning command workflows
│   ├── plan-feature.md
│   ├── plan-prompts.md
│   ├── plan-next.md
│   ├── plan-status.md
│   ├── plan-verify.md
│   └── plan-rollback.md
│
├── templates/          # Reusable templates
│   ├── plan-template.md
│   ├── adr-template.md
│   ├── step-template.md
│   ├── prompt-template.md
│   └── progress-template.json
│
└── plans/              # Plan storage
    └── {NNN}-{slug}/
        ├── plan.md
        ├── adr.md
        ├── steps/
        ├── prompts/
        ├── progress.json
        └── context.md
```

## How It Works

1. **Create Plan** (`/plan-feature`)
   - Analyzes feature request
   - Applies Tree of Thought for major decisions
   - Creates structured plan with steps

2. **Generate Prompts** (`/plan-prompts`)
   - Creates self-contained prompts for each step
   - Each prompt works without prior context
   - Includes verification and error recovery

3. **Execute Steps** (`/plan-next`)
   - Loads current step's prompt
   - Implements following the guide
   - Runs verification
   - Updates progress

4. **Track Progress** (`/plan-status`)
   - Shows completion percentage
   - Highlights blockers
   - Suggests next actions

## Key Features

- **Tree of Thought Analysis**: Every major decision documents 3+ options
- **Self-Contained Prompts**: Each step works independently
- **Progress Tracking**: JSON + Markdown for both machine and human
- **Self-Correction**: Up to 2 automatic fix attempts
- **Context Preservation**: Resume from any point

## For More Details

See [GUIDE.md](./GUIDE.md) for comprehensive documentation.

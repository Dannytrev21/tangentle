# ADR: Automated Plan Implementation System

## Status
Accepted

## Context
Executive Brain needs a systematic way to plan and implement complex features with high code quality. Manual implementation often leads to:
- Inconsistent code quality
- Missed edge cases
- Incomplete documentation
- Difficulty resuming after breaks

We need an automated system that:
1. Creates structured implementation plans
2. Generates optimal AI prompts for each step
3. Tracks progress across sessions
4. Enables self-correction when issues arise
5. Maintains context for fresh terminal starts

## Tree of Thought Analysis

### Decision 1: Directory Structure

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | `.claude/plans/001/` | Simple, auto-increment | No description in path |
| B | `.claude/plans/{feature-name}/` | Descriptive | Name collisions possible |
| **C** | `.claude/plans/{NNN}-{slug}/` | Unique + descriptive | Slightly longer paths |

**Selected: Option C** - Combines unique numbering with human-readable names.

Example: `.claude/plans/001-settings-page/`

### Decision 2: File Organization

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | Single large file | Simple | Hard to parse, update |
| B | Separate files per concern | Organized, parseable | More files to manage |
| **C** | Structured files + JSON state | Best of both | Slightly complex |

**Selected: Option C** - Structured files with machine-readable state.

```
.claude/plans/{NNN}-{slug}/
├── plan.md           # Main plan with Tree of Thought analysis
├── adr.md            # Architecture Decision Record
├── steps/            # Individual step files
│   ├── 01-step-name.md
│   ├── 02-step-name.md
│   └── ...
├── prompts/          # AI prompts for each step
│   ├── 01-step-name.prompt.md
│   ├── 02-step-name.prompt.md
│   └── ...
├── progress.json     # Machine-readable progress state
└── context.md        # Accumulated context for resumption
```

### Decision 3: Progress Tracking

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | Markdown checkboxes only | Human readable | Hard to parse reliably |
| B | JSON only | Machine readable | Not human friendly |
| **C** | JSON state + Markdown sync | Both benefits | Must keep in sync |

**Selected: Option C** - JSON as source of truth, sync to markdown.

```json
{
  "planId": "001",
  "name": "settings-page",
  "status": "in_progress",
  "currentStep": 3,
  "steps": [
    {
      "id": 1,
      "name": "create-settings-service",
      "status": "completed",
      "completedAt": "2025-12-12T10:00:00Z",
      "verificationPassed": true,
      "notes": "All tests passed"
    },
    {
      "id": 2,
      "name": "create-settings-api",
      "status": "completed",
      "completedAt": "2025-12-12T11:00:00Z",
      "verificationPassed": true
    },
    {
      "id": 3,
      "name": "settings-html",
      "status": "in_progress",
      "startedAt": "2025-12-12T12:00:00Z"
    }
  ],
  "context": {
    "lastUpdated": "2025-12-12T12:30:00Z",
    "filesCreated": ["src/services/settings.js"],
    "filesModified": ["src/server.js"],
    "keyDecisions": ["Using JSON file storage", "REST API pattern"],
    "blockers": [],
    "learnings": ["Settings service pattern works well"]
  }
}
```

### Decision 4: Command Architecture

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | Pure slash commands | Native to Claude Code | Limited scripting |
| B | Shell scripts | Powerful automation | External dependency |
| **C** | Slash commands + inline logic | Best integration | Commands can be longer |

**Selected: Option C** - Slash commands with comprehensive inline logic.

Commands:
- `/plan-feature {description}` - Create new plan
- `/plan-prompts {plan}` - Generate prompts for plan
- `/plan-next {plan}` - Execute next step
- `/plan-status {plan}` - Show current progress
- `/plan-verify {plan}` - Verify current step
- `/plan-rollback {plan}` - Rollback failed step

### Decision 5: Self-Correction Mechanism

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | Manual verification only | Simple | Error-prone |
| B | Automated tests only | Objective | May miss UX issues |
| **C** | Multi-layer verification | Comprehensive | More complex |

**Selected: Option C** - Multi-layer verification with escalation.

Verification layers:
1. **Syntax check** - Code compiles/parses
2. **Unit tests** - Automated tests pass
3. **Integration check** - Works with existing code
4. **Self-verification** - AI reviews its own work
5. **Manual checkpoint** - User confirmation for critical steps

### Decision 6: Context Preservation

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | Rely on conversation history | Simple | Lost on compact/new session |
| B | Summary in progress.json | Compact | May lose nuance |
| **C** | Detailed context.md + JSON | Rich context | More storage |

**Selected: Option C** - Detailed context preservation.

Context includes:
- Files created/modified with descriptions
- Key decisions made and rationale
- Problems encountered and solutions
- Patterns established
- Things to remember for next steps

### Decision 7: Prompt Structure

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | Simple instructions | Short | May miss edge cases |
| B | Detailed spec | Comprehensive | Long, may overwhelm |
| **C** | Structured template | Organized, scannable | Template overhead |

**Selected: Option C** - Structured template optimized for AI agents.

Template sections:
1. **Mission** - Clear objective (1-2 sentences)
2. **Context** - Why this matters, dependencies
3. **Required Reading** - Files to read first (with specific line numbers)
4. **Specification** - Detailed requirements
5. **Patterns** - Code patterns to follow (with examples)
6. **Acceptance Criteria** - Checkboxes
7. **Verification Commands** - Exact commands to run
8. **Error Recovery** - What to do when things fail
9. **Completion Protocol** - How to mark step done

## Decision

Implement the automated planning system with:
1. Numbered directory structure with slug names
2. Separate files for plan, ADR, steps, prompts, progress
3. JSON progress tracking synced to markdown
4. Slash commands with comprehensive inline logic
5. Multi-layer verification with self-correction
6. Detailed context preservation for session resumption
7. Structured prompt templates optimized for AI agents

## Consequences

### Positive
- Consistent, high-quality implementations
- Easy to resume after breaks or compacting
- Self-documenting process
- Learnings captured for future reference
- Clear progress visibility

### Negative
- More upfront planning time
- More files to manage
- Learning curve for the system

### Mitigations
- Templates automate most structure creation
- Commands handle file management
- CLAUDE.md documents the system

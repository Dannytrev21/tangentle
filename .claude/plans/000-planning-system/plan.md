# Plan 000: Automated Planning System

## Overview
This meta-plan documents the automated planning system itself. The planning system enables high-quality feature implementation through:
- Structured planning with Tree of Thought analysis
- Optimized AI prompts for each step
- Progress tracking across sessions
- Self-correction on failures
- Context preservation for cold starts

## Status
- **Created**: 2025-12-12
- **Status**: Implemented
- **Type**: System Infrastructure

## Tree of Thought Analysis

### What are we building?
An automated system for planning and implementing features with:
1. Slash commands for workflow control
2. Structured file organization
3. Machine-readable progress tracking
4. AI-optimized prompts
5. Self-correction mechanisms

### Why are we building it?
- **Consistency**: Every feature follows same high-quality process
- **Resumability**: Work can continue after breaks/compacting
- **Self-correction**: AI can fix its own mistakes
- **Documentation**: Process creates its own documentation
- **Scalability**: System works for any feature complexity

### Key Decisions

#### Decision 1: Directory Structure
| Option | Description | Selected |
|--------|-------------|----------|
| A | Single file per plan | No |
| B | Feature-name folders | No |
| **C** | Numbered + slug folders | **Yes** |

**Rationale**: Combines unique identification with human readability.

#### Decision 2: Progress Tracking
| Option | Description | Selected |
|--------|-------------|----------|
| A | Markdown checkboxes | No |
| B | JSON only | No |
| **C** | JSON + Markdown sync | **Yes** |

**Rationale**: JSON for machine parsing, Markdown for human readability.

#### Decision 3: Prompt Design
| Option | Description | Selected |
|--------|-------------|----------|
| A | Minimal instructions | No |
| B | Detailed specification | No |
| **C** | Structured template | **Yes** |

**Rationale**: Template ensures completeness while being scannable.

#### Decision 4: Error Handling
| Option | Description | Selected |
|--------|-------------|----------|
| A | Fail and stop | No |
| B | Retry indefinitely | No |
| **C** | Retry with escalation | **Yes** |

**Rationale**: 2 automatic retries, then human intervention.

## System Components

### Commands
| Command | Purpose |
|---------|---------|
| `/plan-feature` | Create new plan with ToT analysis |
| `/plan-prompts` | Generate AI prompts for steps |
| `/plan-next` | Execute next step |
| `/plan-status` | Check progress |
| `/plan-verify` | Re-run verification |
| `/plan-rollback` | Undo failed step |

### Files Per Plan
| File | Purpose |
|------|---------|
| `plan.md` | Main plan document |
| `adr.md` | Architecture decisions |
| `steps/*.md` | Step specifications |
| `prompts/*.prompt.md` | AI prompts |
| `progress.json` | Machine state |
| `context.md` | Human context |

### Prompt Structure
1. Mission - Clear objective
2. Context - Why it matters
3. Pre-Implementation - Required reading
4. Specification - Detailed requirements
5. Implementation - Step-by-step guide
6. Acceptance - Testable criteria
7. Verification - Commands to run
8. Error Recovery - Fix procedures
9. Completion - Update protocol
10. Do NOT - Common mistakes

## Workflow

```
┌─────────────────┐
│ /plan-feature   │ Create plan with ToT analysis
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /plan-prompts   │ Generate AI prompts
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /plan-next      │◄──────────────┐
└────────┬────────┘               │
         │                        │
         ▼                        │
┌─────────────────┐               │
│ Execute Step    │               │
└────────┬────────┘               │
         │                        │
         ▼                        │
┌─────────────────┐     ┌─────────┴────────┐
│ Verify          │────►│ Next Step        │
└────────┬────────┘Pass └──────────────────┘
         │
         │Fail
         ▼
┌─────────────────┐
│ Self-Correct    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ Retry (2x max)  │────►│ Mark Blocked     │
└─────────────────┘Fail └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ /plan-rollback   │
                        │ or manual fix    │
                        └──────────────────┘
```

## Success Criteria
- [x] Commands create correct file structure
- [x] Progress.json accurately tracks state
- [x] Context.md enables cold-start resumption
- [x] Prompts are self-contained (no prior context needed)
- [x] Verification catches real failures
- [x] Self-correction fixes simple issues
- [x] System documented in CLAUDE.md

## Usage Examples

### Creating a New Feature Plan
```
/plan-feature Build a notifications system that alerts users
when tasks are due, supports email and in-app notifications,
and allows users to configure their preferences.
```

### Checking All Plans
```
/plan-status
```

### Working Through a Plan
```
/plan-prompts 001
/plan-next 001    # Step 1
/plan-next 001    # Step 2
/plan-next 001    # Step 3
...
```

### Handling Failures
```
/plan-verify 001     # Check what failed
# Make manual fixes
/plan-verify 001     # Check again
/plan-next 001       # Continue if passing

# Or rollback and retry
/plan-rollback 001
/plan-next 001
```

## Future Enhancements
- [ ] Parallel step execution for independent steps
- [ ] Plan templates for common patterns
- [ ] Automatic dependency detection
- [ ] Integration with git branches per plan
- [ ] Time tracking per step
- [ ] Plan comparison/diff tools

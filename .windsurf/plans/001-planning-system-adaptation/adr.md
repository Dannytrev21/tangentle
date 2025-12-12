# ADR: Planning System Adaptation for Windsurf

## Status
Accepted

## Context
The existing automated planning system in `.claude/` provides excellent structure for implementing complex features with:
- Tree of Thought analysis for decisions
- Step-by-step implementation plans
- AI-optimized prompts for each step
- Progress tracking and context preservation
- Self-correction mechanisms

However, this system is tightly coupled to Claude Code's slash command system. Windsurf IDE uses a different paradigm:
- **Workflows** instead of slash commands
- **Rules** for persistent AI behavior configuration
- **Memories** for persistent knowledge (auto-managed by Cascade)

This ADR documents the decisions for porting the planning system to Windsurf.

## Tree of Thought Analysis

### Decision 1: Command Translation Strategy

**Context**: Claude Code uses `/plan-feature`, `/plan-next` etc. as slash commands defined in `.claude/commands/*.md`. Windsurf uses workflows in `.windsurf/workflows/*.md`.

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | Direct 1:1 port | Simple translation | May not leverage Windsurf features |
| B | Redesign for Windsurf | Optimized for platform | Diverges from original |
| **C** | Functional equivalent | **Same behavior, native format** | Some adaptation needed |

**Decision**: Option C - Create functionally equivalent workflows that maintain the same planning methodology while using Windsurf-native patterns.

### Decision 2: Instruction Distribution

**Context**: `CLAUDE.md` contains both one-time instructions (commands) and persistent behavior rules. Windsurf separates these into workflows (one-time) and rules (persistent).

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | Single rules file | Simple | Rules have 12k limit |
| **B** | Multiple rules files | **Organized by purpose, can use different activation modes** | More files |
| C | Minimal rules | Keeps context small | Loses guidance |

**Decision**: Option B - Create multiple focused rules files:
- `planning-system.md` - Always-on core behavior
- `plan-file-editing.md` - Glob-activated when editing plan files
- `quality-standards.md` - Always-on code quality

### Decision 3: Progress Tracking

**Context**: The original system uses `progress.json` and `context.md` for tracking. Windsurf has its own Memories system.

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | Use Windsurf Memories | Native integration | Auto-managed, less control |
| **B** | Keep JSON + MD files | **Full control, readable** | Manual management |
| C | Hybrid | Best of both | Complexity |

**Decision**: Option B - Keep the explicit `progress.json` and `context.md` files. They provide:
- Machine-readable state (JSON)
- Human-readable context (MD)
- Version-controlled progress
- Works offline

### Decision 4: Template Storage

**Context**: Workflow files have a 12,000 character limit. Full prompt templates exceed this.

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | Embed in workflows | Self-contained | Exceeds limits |
| **B** | Separate template files | **Reusable, maintainable** | Must be referenced |
| C | Generate on-the-fly | Dynamic | Less consistent |

**Decision**: Option B - Store templates in `.windsurf/templates/` and reference them from workflows. This allows:
- Full-featured templates without size limits
- Reusable patterns across plans
- Easy updates to templates

## Decision Summary

| Aspect | Claude Code | Windsurf |
|--------|-------------|----------|
| Commands | `.claude/commands/*.md` | `.windsurf/workflows/*.md` |
| Instructions | `CLAUDE.md` | `.windsurf/rules/*.md` |
| Plans | `.claude/plans/` | `.windsurf/plans/` |
| Templates | Inline in commands | `.windsurf/templates/` |
| Progress | `progress.json` + `context.md` | Same (explicit files) |

## Consequences

### Positive
- Same powerful planning methodology available in Windsurf
- Better organization with rules/workflows separation
- Reusable templates for consistency
- Can maintain both systems independently

### Negative
- Two systems to maintain if using both IDEs
- Plans not shared between `.claude/` and `.windsurf/`
- Learning curve for Windsurf-specific patterns

### Mitigations
- Clear documentation for each system
- Templates can be symlinked if needed
- Could create sync script for power users

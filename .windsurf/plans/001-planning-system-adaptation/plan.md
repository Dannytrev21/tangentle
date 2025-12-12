# Plan 001: Planning System Adaptation for Windsurf

## Overview
Adapt the Claude Code automated planning system for use with Windsurf IDE, translating slash commands to workflows, CLAUDE.md instructions to rules, and maintaining the same high-quality planning capabilities with Tree of Thought analysis, progress tracking, and self-correction.

## Status
- **Created**: 2025-12-12
- **Status**: Not Started
- **Current Step**: 0 of 7

## Tree of Thought Analysis

### What are we building?
A complete port of the automated planning system from Claude Code to Windsurf IDE, including:
1. **Workflows** - Planning commands become Windsurf workflows (`/plan-feature`, `/plan-next`, etc.)
2. **Rules** - Planning behavior guidelines become Windsurf rules
3. **Directory Structure** - Plans stored in `.windsurf/plans/` instead of `.claude/plans/`
4. **Documentation** - Usage guide adapted for Windsurf

### Why are we building it?
- **IDE Flexibility**: Use the same planning system in Windsurf's Cascade AI
- **Team Collaboration**: Windsurf's rules/workflows are easier to share
- **Feature Parity**: Access the same planning capabilities regardless of IDE
- **Universal Patterns**: The planning methodology works across AI assistants

### Key Decisions

#### Decision 1: Workflow vs Rules for Commands

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | All as Workflows | Invoked via `/command`, natural fit | May hit 12k char limit |
| B | All as Rules | Always available context | Can't be invoked on-demand |
| **C** | Hybrid approach | **Workflows for commands, rules for behavior** | More files to maintain |

**Selected: Option C** - Workflows for `/plan-*` commands (invoked on demand), rules for planning system behavior (always-on context).

#### Decision 2: Rule Activation Modes

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | All always-on | Consistent behavior | May clutter context |
| **B** | Mixed modes | **Glob for plan files, manual for others** | More complex setup |
| C | All manual | User control | May forget to activate |

**Selected: Option B** - Glob-based activation for plan file editing, always-on for core planning rules.

#### Decision 3: Plan Storage Location

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | `.claude/plans/` | Backward compatible | Confusing in Windsurf |
| **B** | `.windsurf/plans/` | **IDE-native location** | Not shared with Claude Code |
| C | `plans/` at root | Tool-agnostic | May conflict with other uses |

**Selected: Option B** - Store plans in `.windsurf/plans/` for native Windsurf organization.

#### Decision 4: Prompt Delivery Method

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | Inline in workflow | Single file | Hits char limit fast |
| **B** | Referenced files | **Workflows load from prompts/** | Extra file navigation |
| C | Memories | Persistent | Not meant for prompts |

**Selected: Option B** - Workflows reference separate prompt files in `prompts/` directory, staying within 12k limit.

## Implementation Steps

| Step | Name | Description | Status |
|------|------|-------------|--------|
| 1 | Directory Structure | Create `.windsurf/` folder structure | Pending |
| 2 | Core Rules | Create planning system rules | Pending |
| 3 | Plan-Feature Workflow | Create feature planning workflow | Pending |
| 4 | Plan-Prompts Workflow | Create prompt generation workflow | Pending |
| 5 | Plan-Next Workflow | Create step execution workflow | Pending |
| 6 | Supporting Workflows | Create status/verify/rollback workflows | Pending |
| 7 | Documentation | Create usage guide and README | Pending |

## Files to Create

### Directory Structure
- `.windsurf/rules/` - Planning system rules
- `.windsurf/workflows/` - Planning workflow commands
- `.windsurf/plans/` - Plan storage (per-project)
- `.windsurf/templates/` - Reusable templates

### Rules Files
- `.windsurf/rules/planning-system.md` - Core planning behavior (always-on)
- `.windsurf/rules/plan-file-editing.md` - Context when editing plan files (glob)
- `.windsurf/rules/quality-standards.md` - Code quality rules (always-on)

### Workflow Files
- `.windsurf/workflows/plan-feature.md` - Create new plan
- `.windsurf/workflows/plan-prompts.md` - Generate AI prompts
- `.windsurf/workflows/plan-next.md` - Execute next step
- `.windsurf/workflows/plan-status.md` - Check progress
- `.windsurf/workflows/plan-verify.md` - Re-run verification
- `.windsurf/workflows/plan-rollback.md` - Rollback changes

### Template Files
- `.windsurf/templates/plan-template.md` - Plan document template
- `.windsurf/templates/adr-template.md` - ADR template
- `.windsurf/templates/step-template.md` - Step specification template
- `.windsurf/templates/prompt-template.md` - AI prompt template
- `.windsurf/templates/progress-template.json` - Progress tracking template

## Files to Modify
None - this is a new system for Windsurf

## Dependencies
- Step 1 must complete before all others (creates folder structure)
- Steps 2-6 can proceed in parallel after Step 1
- Step 7 should be last (documents the completed system)

## Success Criteria
- [ ] All workflows invoke correctly via `/plan-*` commands
- [ ] Rules activate appropriately (glob for plan files, always-on for core)
- [ ] Plans can be created, executed, and tracked
- [ ] Progress persists between sessions
- [ ] Documentation enables new users to start planning
- [ ] System works independently of Claude Code setup

## Rollback Plan
Since this creates new files without modifying existing ones:
1. Delete `.windsurf/` directory
2. No impact on existing `.claude/` planning system

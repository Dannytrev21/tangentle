# Plan Prompts

Generate optimized AI prompts for each step in an implementation plan.

## Description

This workflow creates self-contained prompts that enable any AI assistant to implement plan steps without prior context. Each prompt includes everything needed: context, requirements, verification, and error recovery.

## Steps

### 1. Locate the Plan

Find the plan directory:
```bash
ls -d .windsurf/plans/$ARGUMENTS* 2>/dev/null | head -1
```

If multiple matches or no matches, list available plans:
```bash
ls -la .windsurf/plans/
```

### 2. Read Plan Context

Read these files to understand the full plan:
1. `{plan-dir}/plan.md` - Overall plan
2. `{plan-dir}/adr.md` - Architectural decisions
3. `{plan-dir}/progress.json` - Current state
4. All files in `{plan-dir}/steps/`

### 3. Create Prompts Directory

```bash
mkdir -p {plan-dir}/prompts
```

### 4. Generate Prompt for Each Step

For each step file in `steps/`, create a corresponding prompt in `prompts/`.

**File naming**: `{NN}-{step-name}.prompt.md`

**Use the prompt template** from `.windsurf/templates/prompt-template.md`.

Each prompt MUST include these 10 sections:

1. **Mission** - One clear sentence objective
2. **Context** - Plan summary, why this step matters
3. **Pre-Implementation** - Files to read, prerequisites to verify
4. **Specification** - Detailed requirements
5. **Implementation Guide** - Step-by-step instructions
6. **Acceptance Criteria** - Testable criteria with verification commands
7. **Verification Protocol** - Commands to run (copy-pasteable)
8. **Error Recovery** - How to fix common failures
9. **Completion Protocol** - How to update progress
10. **Do NOT** - Common mistakes to avoid

### 5. Ensure Self-Containment

Every prompt must work with ZERO prior context:
- All file paths absolute or clearly relative to project root
- Code patterns included inline (not "as discussed")
- Commands copy-pasteable without modification
- No references to "previous conversation"

### 6. Update Progress

After generating all prompts, update `progress.json`:
```json
{
  "steps[N].promptGenerated": true
}
```

For each step that got a prompt generated.

### 7. Output Summary

```
## Prompts Generated for Plan {NNN}

**Plan**: {Plan Name}
**Prompts Created**: {N} prompts

### Prompt Files
| Step | File | Ready |
|------|------|-------|
| 1 | 01-{name}.prompt.md | Yes |
| 2 | 02-{name}.prompt.md | Yes |

### Next Command
`/plan-next {NNN}` - Start implementing step 1

### Manual Usage
To run a step manually:
1. Open the prompt file
2. Copy entire content
3. Paste to fresh AI session
```

## Quality Checklist

Before completing:
- [ ] Every step has a prompt file
- [ ] Each prompt includes all 10 sections
- [ ] Verification commands are copy-pasteable
- [ ] No references to prior context
- [ ] progress.json updated with promptGenerated flags

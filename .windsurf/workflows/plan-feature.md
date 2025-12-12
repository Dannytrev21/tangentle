# Plan Feature

Create a comprehensive implementation plan for a new feature with Tree of Thought analysis.

## Description

This workflow guides you through creating a structured implementation plan. It will:
1. Analyze the feature request
2. Apply Tree of Thought analysis for decisions
3. Create plan directory and files
4. Initialize progress tracking

## Steps

### 1. Understand the Feature Request

Read the feature description provided after `/plan-feature`.

Before proceeding:
- Read any relevant existing code to understand patterns
- Identify which systems/files will be affected
- Note any ambiguities to resolve

### 2. Determine Plan Number

Check existing plans:
```bash
ls -d .windsurf/plans/[0-9]* 2>/dev/null | sort -V | tail -1
```

- If no plans exist, use `001`
- Otherwise increment the highest number

### 3. Create Plan Directory

Create the directory structure:
```bash
mkdir -p .windsurf/plans/{NNN}-{feature-slug}/{steps,prompts}
```

Replace:
- `{NNN}` with 3-digit plan number
- `{feature-slug}` with kebab-case feature name

### 4. Apply Tree of Thought Analysis

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
- API/interface design
- Integration strategy
- Testing approach

### 5. Create plan.md

Use the template from `.windsurf/templates/plan-template.md`.

Include:
- Overview (2-3 sentences)
- Status section
- Tree of Thought analysis
- Implementation steps table
- Files to create/modify
- Success criteria
- Rollback plan

### 6. Create adr.md

Document architectural decisions using `.windsurf/templates/adr-template.md`.

Include:
- Context (why needed)
- All decisions with options
- Selected approach
- Consequences (positive/negative)
- Mitigations

### 7. Create Step Files

For each implementation step, create a file in `steps/`:
- `01-{step-name}.md`
- `02-{step-name}.md`
- etc.

Each step should be completable in 30-90 minutes.

Use `.windsurf/templates/step-template.md` for structure.

### 8. Create Progress Tracking

Create `progress.json` with initial state:
```json
{
  "planId": "{NNN}",
  "name": "{feature-slug}",
  "title": "{Feature Name}",
  "status": "not_started",
  "currentStep": 0,
  "totalSteps": {N},
  "steps": [...]
}
```

Create `context.md` with:
- Quick status
- Key decisions made
- Next actions

### 9. Output Summary

After creating all files, output:

```
## Plan Created: {NNN}-{feature-slug}

**Feature**: {Feature Name}
**Steps**: {N} implementation steps
**Location**: .windsurf/plans/{NNN}-{feature-slug}/

### Next Commands
1. `/plan-prompts {NNN}` - Generate AI prompts
2. `/plan-next {NNN}` - Start implementing
```

## Quality Checklist

Before completing:
- [ ] Tree of Thought analysis done for major decisions
- [ ] Each step is 30-90 minutes of focused work
- [ ] Acceptance criteria are testable
- [ ] Dependencies between steps are explicit
- [ ] progress.json initialized correctly

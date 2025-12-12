# Step 2: Create Planning System Rules

## Context
Windsurf uses rules files to configure persistent AI behavior. These replace the instructional parts of `CLAUDE.md` that apply consistently across interactions.

## Goal
Create the core rules files that define how Cascade should behave when working with the planning system.

## Prerequisites
- Step 1 completed (directory structure exists)

## High-Level Steps
1. Create `planning-system.md` - Core planning behavior (always-on)
2. Create `plan-file-editing.md` - Context for editing plan files (glob-activated)
3. Create `quality-standards.md` - Code quality standards (always-on)

## Detailed Requirements

### planning-system.md (Always-On)
This rule provides context about the planning system whenever Cascade is active:
- What the planning system is
- Available workflows (`/plan-feature`, `/plan-next`, etc.)
- How progress tracking works
- Where plans are stored

### plan-file-editing.md (Glob: `**/plans/**/*.md`)
Activated when editing files in any `plans/` directory:
- Plan file structure expectations
- How to update progress.json and context.md
- Verification requirements
- Quality standards for plan content

### quality-standards.md (Always-On)
General coding standards to maintain:
- Code should follow existing patterns
- No debug code left behind
- Proper error handling
- Documentation requirements

## Files to Create
- `.windsurf/rules/planning-system.md`
- `.windsurf/rules/plan-file-editing.md`
- `.windsurf/rules/quality-standards.md`

## Files to Modify
None

## Patterns to Follow
From Windsurf docs:
- Keep rules simple, concise, and specific
- Use bullet points and numbered lists
- Stay under 12,000 characters per file
- Avoid generic guidelines (already in model training)

## Acceptance Criteria
- [ ] `planning-system.md` created with always-on activation mode
- [ ] `plan-file-editing.md` created with glob activation pattern
- [ ] `quality-standards.md` created with always-on activation mode
- [ ] All files under 12,000 characters
- [ ] Rules use markdown formatting (bullets, headers)

## Verification Commands
```bash
# Check files exist and size
wc -c .windsurf/rules/*.md

# Verify content is markdown
head -50 .windsurf/rules/planning-system.md
```

## Documentation Updates
None yet - documentation step comes last.

## Error Recovery
If rules don't activate:
1. Check activation mode is correctly specified
2. Verify file is in `.windsurf/rules/` directory
3. Check for syntax/formatting issues
4. Ensure file size is under 12,000 characters

## Do NOT
- Exceed 12,000 characters per file
- Use vague or generic instructions
- Duplicate content between rule files
- Include command/workflow logic (that goes in workflows)

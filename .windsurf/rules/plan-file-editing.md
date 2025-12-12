# Plan File Editing Rules

> **Activation**: Glob `**/plans/**/*.md`, `**/plans/**/*.json`

## When Editing Plan Files

These rules apply when you're editing files within any `plans/` directory.

## Plan File Types

### plan.md
- Contains overall plan overview and implementation steps
- Update the Status section when steps complete
- Keep Implementation Steps table in sync with progress.json

### adr.md
- Architecture Decision Record
- Document all major decisions with options considered
- Update Status field as plan progresses

### steps/*.md
- Individual step specifications
- Don't modify after creation unless spec changes
- Reference these when generating prompts

### prompts/*.prompt.md
- AI-optimized prompts for each step
- Must be self-contained (no prior context needed)
- Include verification commands that are copy-pasteable

### progress.json
Required updates after each step:
```json
{
  "currentStep": <next step number>,
  "updatedAt": "<ISO timestamp>",
  "steps[N].status": "completed|blocked|in_progress",
  "steps[N].completedAt": "<ISO timestamp if complete>",
  "steps[N].verificationPassed": true|false,
  "steps[N].attempts": <number of attempts>
}
```

### context.md
Update after every session with:
- What was accomplished
- Files created/modified
- Key decisions made
- Learnings
- Blockers (if any)
- What to do next

## Quality Standards

- Keep acceptance criteria testable and specific
- Verification commands must be copy-pasteable
- Document the "why" not just the "what"
- Reference specific file paths and line numbers

## Common Mistakes to Avoid

- Marking step complete without all criteria passing
- Forgetting to update progress.json
- Leaving context.md stale after a session
- Writing vague acceptance criteria
- Skipping Tree of Thought for major decisions

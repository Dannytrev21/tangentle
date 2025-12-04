# Quick Add Task

Fast task capture mode. Minimal questions.

The user will provide a task. Your job:
1. Parse the task description
2. Infer the project based on context (work-related → Work, health → Health, etc.)
3. Infer priority (default to Medium unless urgency is mentioned)
4. Set a reasonable due date if implied
5. Create the task immediately using TickTick MCP tools
6. Confirm what was created

Only ask a question if you genuinely can't determine the project.

Example inputs and how to handle:
- "Call mom" → Relationships, no due date, Low priority
- "Fix the login bug" → Work, no due date, Medium priority
- "Buy milk" → Shopping List, no due date, Low priority
- "Pay rent by Friday" → Finances, due Friday, High priority
- "Schedule dentist appointment" → Health, no due date, Medium priority

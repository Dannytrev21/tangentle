# Quality Standards Rules

> **Activation**: Always On

## Code Quality

When implementing features:

1. **Follow Existing Patterns**
   - Read similar existing code first
   - Match naming conventions
   - Use established patterns for error handling

2. **No Debug Code**
   - Remove all console.log statements
   - Remove commented-out code
   - Remove TODO comments (track in issues instead)

3. **Error Handling**
   - Handle expected errors gracefully
   - Provide useful error messages
   - Don't swallow errors silently

4. **Documentation**
   - Update relevant docs when changing behavior
   - Add JSDoc for public functions
   - Keep comments current with code

## Verification Requirements

Before marking any task complete:

1. **Syntax Check** - Code compiles/parses without errors
2. **Tests Pass** - Run relevant test suite
3. **Integration** - Works with existing code
4. **Self-Review** - Check your own work against requirements

## Progress Tracking

When using the planning system:

1. Read progress.json before starting
2. Update progress.json after completing
3. Update context.md with session summary
4. Never mark complete without verification passing

## Commit Messages

Follow conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `refactor:` Code changes that don't add features or fix bugs
- `test:` Adding or updating tests

## File Organization

- Keep files focused and single-purpose
- Group related functionality
- Use consistent directory structure

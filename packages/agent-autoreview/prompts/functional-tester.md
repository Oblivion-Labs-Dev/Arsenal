# Functional Tester

Run only checks relevant to changed files and affected routes.

## Prefer
- eslint <changed files>
- vitest related / jest --findRelatedTests
- incremental tsc when needed
- playwright tests selected by route or tags

## Avoid
- Full-repository lint/test/browser crawls by default

## Full-repo checks only when
- Global configuration changed
- Shared public API changed
- Package build requires it
- User explicitly requested it

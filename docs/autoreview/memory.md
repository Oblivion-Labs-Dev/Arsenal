# Memory system

`.agent-memory/` stores repository design feedback only.

```bash
arsenal generate memory
```

Promotion:
- observation → component after 2 matching corrections or explicit component preference
- repository only if explicit global wording or 3+ components

Retrieval is capped (10 rules / 5 anti-patterns / 3 decisions / 4000 tokens).

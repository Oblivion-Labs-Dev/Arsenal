# Cursor command: /autoreview

Run scoped implementation verification for the current task.

```bash
arsenal autoreview --task "$ARGUMENTS"
```

Fast mode:

```bash
arsenal autoreview --task "$ARGUMENTS" --mode fast
```

Thorough mode:

```bash
arsenal autoreview --task "$ARGUMENTS" --mode thorough
```

If a task session was started:

```bash
arsenal autoreview session start --task "$ARGUMENTS"
# ... implement ...
arsenal autoreview --task "$ARGUMENTS"
arsenal autoreview session finish
```

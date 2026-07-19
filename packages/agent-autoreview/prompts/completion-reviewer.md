# Completion Reviewer

Decide whether the current task may be declared complete.

## Required checks
- Scoped quality gates pass
- No unresolved critical findings
- No high-severity visual issue with confidence > 0.8 left unresolved
- No broken primary interaction in scope
- Remaining exclusions and budget usage are disclosed
- Report language states verification was for the current task scope only

## Fail completion if
- Gates failed
- Findings were hidden or downgraded without evidence
- Scope was expanded without recorded justification
- Unrelated routes were opened

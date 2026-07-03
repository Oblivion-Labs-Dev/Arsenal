# Architecture Rules

- forge/ imports and composes arsenal/ capabilities.
- arsenal/ must NEVER import forge/.
- Shared utilities belong in arsenal/packages/core or shared.
- Domain layer must be separated from UI/App layer.

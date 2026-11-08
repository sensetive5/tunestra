---
"tunestra": minor
---

Add `permissions`: `allow`, `ask` and `deny` rules in the syntax of Claude Code, like `Bash(npm test *)` or `Read(./.env)`. The lists of every level are joined; `exclude.permissions` removes inherited `allow` and `ask` rules, but a `deny` rule cannot be removed. Claude Code gets the rules in `.claude/settings.json`. Codex gets `deny` and `ask` rules for shell commands in `.codex/rules/tunestra.rules`; setup notes the rules that Codex cannot enforce.

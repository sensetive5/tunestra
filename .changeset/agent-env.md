---
"tunestra": minor
---

Add `env`: environment variables for the agents, in `tunestra.yaml` and in preset manifests. A more specific level overrides a variable by name, and `exclude.env` removes an inherited one. Claude Code gets them in `.claude/settings.json`, which you commit; Codex gets them as `[shell_environment_policy] set` in `.codex/config.toml`. setup stops on values like `${TOKEN}`, which agents do not expand, and on variables that Claude Code ignores in a project, like the ones that turn telemetry on.

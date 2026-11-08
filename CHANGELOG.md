# tunestra

## 0.3.0

### Minor Changes

- 2a95e84: Add `env`: environment variables for the agents, in `tunestra.yaml` and in preset manifests. A more specific level overrides a variable by name, and `exclude.env` removes an inherited one. Claude Code gets them in `.claude/settings.json`, which you commit; Codex gets them as `[shell_environment_policy] set` in `.codex/config.toml`. setup stops on values like `${TOKEN}`, which agents do not expand, and on variables that Claude Code ignores in a project, like the ones that turn telemetry on.

## 0.2.0

### Minor Changes

- c1fcd7f: Add Codex. With `agents: [claude, codex]` in `tunestra.yaml`, `tunestra setup` also writes `.codex/config.toml`: the rules go to `developer_instructions` and the MCP servers go to `[mcp_servers]`. Commands become Codex skills that run only when you call them, like `$release-notes`. Codex reads this config only in a trusted project, and setup reminds you about it.

## 0.1.1

### Patch Changes

- `uninstall` no longer leaves an empty `.tunestra` folder.

## 0.1.0

### Minor Changes

- First release, for Claude Code. Presets inherit from each other on four levels: base,
  domain, team and project. `setup` generates `AGENTS.md` as an index of the setup,
  `CLAUDE.md`, rules, skills, commands and `.mcp.json`, and keeps a registry so that it
  can run again safely. Presets come from local folders, GitHub or GitLab. `init` and
  `uninstall` start and remove the setup.

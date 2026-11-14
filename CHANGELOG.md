# tunestra

## 0.6.0

### Minor Changes

- 8fca31b: Add a personal level. A developer can tune the setup for themselves with `tunestra.local.yaml`
  and `.tunestra.local/`, which are never committed; `tunestra init --local` creates both. The committed files stay the same for the
  whole team; Claude Code gets `CLAUDE.local.md` and personal settings in
  `.claude/settings.local.json`, and Codex gets `AGENTS.override.md`.

## 0.5.0

### Minor Changes

- f64c772: Add subagents. A preset or a project can put subagents in `agents/<name>.md`: a description,
  the instructions, an optional model for each agent, the reasoning effort and a `readOnly` flag.
  Claude Code gets them in `.claude/agents/`, and Codex gets them in `.codex/agents/`.

## 0.4.0

### Minor Changes

- 59bfe37: Add `permissions`: `allow`, `ask` and `deny` rules in the syntax of Claude Code, like `Bash(npm test *)` or `Read(./.env)`. The lists of every level are joined; `exclude.permissions` removes inherited `allow` and `ask` rules, but a `deny` rule cannot be removed. Claude Code gets the rules in `.claude/settings.json`. Codex gets `deny` and `ask` rules for shell commands in `.codex/rules/tunestra.rules`; setup notes the rules that Codex cannot enforce.

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

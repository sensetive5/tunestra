# tunestra

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

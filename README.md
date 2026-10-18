# tunestra

> Tune your AI agents to play as one orchestra.

**Status: early development. Nothing to use yet.**

tunestra gives Claude Code, Codex and other AI coding agents one shared source of
rules, skills, commands, MCP servers and hooks — and generates each agent's native
configuration from it.

Planned:

- **Inheritance from general to specific.** Organization → domain → team → project → personal
  levels. More specific levels override general ones by artifact key or exclude them.
- **One source for every agent.** Built on open standards: `AGENTS.md` and Agent Skills (`SKILL.md`).
- **Policies.** Upper levels can mark artifacts as `required` or `locked`, checked in CI.
- **Spaces.** Share presets through git or npm.
- **Generated, never hand-edited.** Every run rebuilds agent configs from the sources.

## License

[MIT](LICENSE)

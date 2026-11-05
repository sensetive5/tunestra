# Fixture: codex

The `basic` fixture with `agents: [claude, codex]`, a command with frontmatter that only
Claude Code reads, a remote MCP server with headers and environment variables on every level.
The layout is the same as in `basic`.

What this fixture covers:

- rules in `developer_instructions` of `.codex/config.toml`, from specific to general;
- MCP servers in `[mcp_servers]`: a local one and a remote one with `http_headers`;
- a command as a Codex skill that runs only on `$release-notes`;
- `env` on every level: a number as text, a variable overridden by team and one excluded by
  the project, an off value for telemetry that Claude Code accepts from a project;
- `env` in `.claude/settings.json` and in `[shell_environment_policy] set` of Codex;
- the outputs of Claude Code and Codex in one project, without conflicts.

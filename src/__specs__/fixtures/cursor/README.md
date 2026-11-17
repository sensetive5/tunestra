# Fixture: cursor

The `codex` fixture with `agents: [claude, codex, cursor]` and more permission rules in the
project: a web fetch, an MCP tool, a write outside the project and a command with shell
syntax. The layout is the same as in `basic`.

What this fixture covers:

- rules in `.cursor/rules/tunestra/*.mdc` with `alwaysApply: true`;
- one `SKILL.md` for a command that Codex and Cursor share, with `disable-model-invocation`;
- a read-only subagent in `.cursor/agents/` with `readonly: true`;
- MCP servers in `.cursor/mcp.json`;
- permissions in `.cursor/cli.json`: `Shell`, `Read`, `Write`, `WebFetch` and `Mcp` rules;
  `ask` rules and rules with shell syntax are skipped;
- the outputs of Claude Code, Codex and Cursor in one project, without conflicts.

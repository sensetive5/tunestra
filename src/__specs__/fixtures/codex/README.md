# Fixture: codex

The `basic` fixture with `agents: [claude, codex]`, a command with frontmatter that only
Claude Code reads and a remote MCP server with headers. The layout is the same as in `basic`.

What this fixture covers:

- rules in `developer_instructions` of `.codex/config.toml`, from specific to general;
- MCP servers in `[mcp_servers]`: a local one and a remote one with `http_headers`;
- a command as a Codex skill that runs only on `$release-notes`;
- the outputs of Claude Code and Codex in one project, without conflicts.

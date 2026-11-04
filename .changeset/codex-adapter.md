---
"tunestra": minor
---

Add Codex. With `agents: [claude, codex]` in `tunestra.yaml`, `tunestra setup` also writes `.codex/config.toml`: the rules go to `developer_instructions` and the MCP servers go to `[mcp_servers]`. Commands become Codex skills that run only when you call them, like `$release-notes`. Codex reads this config only in a trusted project, and setup reminds you about it.

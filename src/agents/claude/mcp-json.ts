import type { McpServer } from '../../shared/types/preset.ts';
import type { ResolvedArtifact } from '../../shared/types/resolution.ts';

/** `.mcp.json` in the shape Claude Code reads: `{ "mcpServers": { "<key>": config } }`. */
export function renderMcpJson(servers: ReadonlyArray<ResolvedArtifact<McpServer>>): string {
  const entries = servers.map((server) => [server.artifact.key, server.artifact.config]);
  const mcpServers = Object.fromEntries(entries);
  const content = {
    mcpServers,
  };
  const json = JSON.stringify(content, null, 2);

  return `${json}\n`;
}

import { mcpServerSchema } from '../shared/schemas/preset.ts';
import type { McpPatch, McpServer, Preset } from '../shared/types/preset.ts';
import type { ResolvedArtifact } from '../shared/types/resolution.ts';
import { createOrigin, type PatchArtifacts } from './inherit-artifacts.ts';
import { patchMcpConfig } from './patch-mcp-config.ts';

/** Applies `overrides.mcp` of a level to the MCP servers it inherits. */
export const patchMcpServers: PatchArtifacts<McpServer> = (inherited, level) => {
  const patches = level.overrides.mcp ?? {};
  const patchEntries = Object.entries(patches);
  const problems: Array<string> = [];

  for (const [key, patch] of patchEntries) {
    const server = inherited.get(key);

    if (server === undefined) {
      problems.push(
        `${level.name}: overrides.mcp lists "${key}", but no more general level has this MCP server`,
      );

      continue;
    }

    const patched = applyPatch(server, level, patch);
    const check = mcpServerSchema.safeParse(patched.artifact.config);

    if (check.success === false) {
      problems.push(
        `${level.name}: after the patch, MCP server "${key}" must have either "command" or "url"`,
      );
    }

    inherited.set(key, patched);
  }

  return problems;
};

function applyPatch(
  server: ResolvedArtifact<McpServer>,
  level: Preset,
  patch: McpPatch,
): ResolvedArtifact<McpServer> {
  const config = patchMcpConfig(server.artifact.config, patch);
  const origin = createOrigin(level);
  const artifact = {
    ...server.artifact,
    config,
  };
  const patchedBy = [...server.patchedBy, origin];

  return {
    ...server,
    artifact,
    patchedBy,
  };
}

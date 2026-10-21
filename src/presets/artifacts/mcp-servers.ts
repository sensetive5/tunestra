import { basename, join } from 'node:path';
import type { McpServer } from '../../shared/types/preset.ts';
import { listFiles } from '../../shared/utils/fs.ts';
import { mapSettled } from '../../shared/utils/settled.ts';
import { mcpServerSchema } from '../schema.ts';
import { readYaml } from '../yaml.ts';

export async function loadMcpServers(dir: string): Promise<ReadonlyArray<McpServer>> {
  const sources = await listFiles(dir, 'mcp/*.yaml');

  return mapSettled(sources, (source) => loadMcpServer(dir, source));
}

async function loadMcpServer(dir: string, source: string): Promise<McpServer> {
  const file = join(dir, source);
  const { description, ...config } = await readYaml(file, mcpServerSchema, 'MCP server');

  const key = basename(source, '.yaml');

  return {
    key,
    source,
    description,
    config,
  };
}

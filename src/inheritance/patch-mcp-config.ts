import type { McpConfig, McpPatch } from '../shared/types/preset.ts';
import { mergeRecords } from '../shared/utils/records.ts';

/** `env` and `headers` are merged by key; `command`, `args` and `url` are replaced. */
export function patchMcpConfig(config: McpConfig, patch: McpPatch): McpConfig {
  const command = patch.command ?? config.command;
  const args = patch.args ?? config.args;
  const url = patch.url ?? config.url;
  const env = mergeRecords(config.env, patch.env);
  const headers = mergeRecords(config.headers, patch.headers);

  return {
    ...config,
    command,
    args,
    url,
    env,
    headers,
  };
}

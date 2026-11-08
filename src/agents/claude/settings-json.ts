import type { EnvVariable } from '../../shared/types/preset.ts';
import type { ResolvedArtifact } from '../../shared/types/resolution.ts';
import { buildEnvMap } from '../../shared/utils/env.ts';

const SETTINGS_SCHEMA = 'https://json.schemastore.org/claude-code-settings.json';

/** The keys that tunestra writes; a file with only these keys is a generated one. */
export const SETTINGS_KEYS: ReadonlyArray<string> = ['$schema', 'env'];

export function renderSettingsJson(env: ReadonlyArray<ResolvedArtifact<EnvVariable>>): string {
  const variables = buildEnvMap(env);
  const content = {
    $schema: SETTINGS_SCHEMA,
    env: variables,
  };
  const json = JSON.stringify(content, null, 2);

  return `${json}\n`;
}

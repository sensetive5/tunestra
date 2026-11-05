import type { EnvVariable } from '../shared/types/preset.ts';
import { relativePosix } from '../shared/utils/paths.ts';

/** The `env` map of a manifest as artifacts, in the order of the file. */
export function createEnvVariables(
  env: Readonly<Record<string, string>>,
  manifestPath: string,
  artifactsDir: string,
): ReadonlyArray<EnvVariable> {
  const source = relativePosix(artifactsDir, manifestPath);
  const entries = Object.entries(env);

  return entries.map(([key, value]) => ({
    key,
    source,
    value,
  }));
}

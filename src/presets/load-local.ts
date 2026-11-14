import { join, resolve } from 'node:path';
import { LOCAL_CONFIG, LOCAL_DIR } from '../shared/constants/files.ts';
import { Level } from '../shared/constants/levels.ts';
import { localConfigSchema } from '../shared/schemas/preset.ts';
import type { Preset } from '../shared/types/preset.ts';
import { checkExists } from '../shared/utils/fs.ts';
import { readYaml } from '../shared/utils/yaml.ts';
import { loadArtifacts } from './artifacts/load-artifacts.ts';
import { createEnvVariables } from './env.ts';
import { createPermissionRules } from './permissions.ts';

/** The personal level of the developer, when the project has `tunestra.local.yaml`. */
export async function loadLocal(
  projectDir: string,
): Promise<Preset<typeof Level.Local> | undefined> {
  const root = resolve(projectDir);
  const configPath = join(root, LOCAL_CONFIG);
  const hasConfig = await checkExists(configPath);

  if (hasConfig === false) {
    return undefined;
  }

  const config = await readYaml(configPath, localConfigSchema, 'personal config');
  const artifactsDir = join(root, LOCAL_DIR);
  const artifacts = await loadArtifacts(artifactsDir, config.name);
  const env = createEnvVariables(config.env, configPath, artifactsDir);
  const permissions = createPermissionRules(config.permissions, configPath, artifactsDir);

  return {
    ...config,
    level: Level.Local,
    description: undefined,
    dir: root,
    artifactsDir,
    remote: undefined,
    ...artifacts,
    env,
    permissions,
  };
}

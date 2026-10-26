import { basename, join, resolve } from 'node:path';
import { PROJECT_CONFIG, PROJECT_DIR } from '../shared/constants/files.ts';
import { Level } from '../shared/constants/levels.ts';
import { TunestraError } from '../shared/errors/tunestra-error.ts';
import { projectConfigSchema } from '../shared/schemas/preset.ts';
import type { Project } from '../shared/types/preset.ts';
import { checkExists } from '../shared/utils/fs.ts';
import { readYaml } from '../shared/utils/yaml.ts';
import { loadArtifacts } from './artifacts/load-artifacts.ts';

export async function loadProject(dir: string): Promise<Project> {
  const root = resolve(dir);
  const configPath = join(root, PROJECT_CONFIG);
  const hasConfig = await checkExists(configPath);

  if (hasConfig === false) {
    throw new TunestraError(`${PROJECT_CONFIG} not found in ${root}. Run \`tunestra init\` first`);
  }

  const config = await readYaml(configPath, projectConfigSchema, 'project config');
  const folderName = basename(root);
  const name = config.name ?? folderName;
  const artifactsDir = join(root, PROJECT_DIR);
  const artifacts = await loadArtifacts(artifactsDir, name);

  return {
    ...config,
    name,
    level: Level.Project,
    description: undefined,
    dir: root,
    artifactsDir,
    ...artifacts,
  };
}

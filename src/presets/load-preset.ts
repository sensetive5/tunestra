import { join, resolve } from 'node:path';
import { TunestraError } from '../errors.ts';
import { PRESET_MANIFEST } from '../shared/constants/files.ts';
import type { PresetLevel } from '../shared/constants/levels.ts';
import type { Preset } from '../shared/types/preset.ts';
import { checkExists } from '../shared/utils/fs.ts';
import { loadArtifacts } from './artifacts/load-artifacts.ts';
import { presetManifestSchema } from './schema.ts';
import { readYaml } from './yaml.ts';

export async function loadPreset(dir: string): Promise<Preset<PresetLevel>> {
  const root = resolve(dir);
  const manifestPath = join(root, PRESET_MANIFEST);
  const hasManifest = await checkExists(manifestPath);

  if (hasManifest === false) {
    throw new TunestraError(`${root} is not a preset: ${PRESET_MANIFEST} is missing`);
  }

  const manifest = await readYaml(manifestPath, presetManifestSchema, 'preset manifest');
  const artifacts = await loadArtifacts(root, manifest.name);

  return {
    ...manifest,
    description: manifest.description,
    dir: root,
    artifactsDir: root,
    ...artifacts,
  };
}

import { join } from 'node:path';
import { LOCK_FILE } from '../shared/constants/files.ts';
import { lockSchema } from '../shared/schemas/lock.ts';
import type { LockedSources } from '../shared/types/source.ts';
import { readFileIfExists } from '../shared/utils/fs.ts';
import { validate } from '../shared/utils/validate.ts';
import { parseYaml } from '../shared/utils/yaml.ts';

/** Sources from `tunestra.lock.yaml`; a project without the file has none. */
export async function readLock(projectDir: string): Promise<LockedSources> {
  const file = join(projectDir, LOCK_FILE);
  const content = await readFileIfExists(file);

  if (content === undefined) {
    return {};
  }

  const data = parseYaml(content, `YAML in ${file}`);
  const lock = validate(
    data,
    lockSchema,
    `lock file ${file}. Delete it and run tunestra setup again`,
  );

  return lock.sources;
}

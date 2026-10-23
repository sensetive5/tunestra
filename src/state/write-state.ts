import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { STATE_FILE } from '../shared/constants/output.ts';
import type { SetupState } from '../shared/types/state.ts';

/** Paths are sorted, so that the file only changes when the outputs change. */
export async function writeState(projectDir: string, state: SetupState): Promise<void> {
  const file = join(projectDir, STATE_FILE);
  const dir = dirname(file);
  const paths = Object.keys(state.outputs).sort();
  const entries = paths.map((path) => [path, state.outputs[path]]);
  const outputs = Object.fromEntries(entries);
  const content = {
    version: state.version,
    outputs,
  };
  const json = JSON.stringify(content, null, 2);
  const text = `${json}\n`;

  await mkdir(dir, { recursive: true });
  await writeFile(file, text);
}

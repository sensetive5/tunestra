import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { STATE_FILE } from '../shared/constants/output.ts';
import type { SetupState } from '../shared/types/state.ts';

/** Paths are sorted, so that the file only changes when the outputs change. */
export async function writeState(projectDir: string, state: SetupState): Promise<void> {
  const file = join(projectDir, STATE_FILE);
  const dir = dirname(file);
  const outputs = sortByKey(state.outputs);
  const merges = sortByKey(state.merges);
  const content = {
    version: state.version,
    outputs,
    merges,
  };
  const json = JSON.stringify(content, null, 2);
  const text = `${json}\n`;

  await mkdir(dir, { recursive: true });
  await writeFile(file, text);
}

function sortByKey<TValue>(record: Readonly<Record<string, TValue>>): Record<string, TValue> {
  const entries = Object.entries(record);
  // By code points, like the paths before; keys are unique, so two are never equal.
  const sorted = entries.toSorted(([left], [right]) => (left < right ? -1 : 1));

  return Object.fromEntries(sorted);
}

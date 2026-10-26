import { readFile } from 'node:fs/promises';
import { OutputKind } from '../shared/constants/output.ts';
import type { Output } from '../shared/types/output.ts';
import type { OutputRecord } from '../shared/types/state.ts';
import { hashContent } from '../shared/utils/hash.ts';

/** How an output will look on the disk once it is written. */
export async function createRecord(output: Output): Promise<OutputRecord> {
  switch (output.kind) {
    case OutputKind.File: {
      const hash = hashContent(output.content);

      return {
        hash,
      };
    }
    case OutputKind.Copy: {
      const content = await readFile(output.from);
      const hash = hashContent(content);

      return {
        hash,
      };
    }
    case OutputKind.Symlink:
      return {
        target: output.target,
      };
  }
}

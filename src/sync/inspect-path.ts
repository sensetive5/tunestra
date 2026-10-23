import { readFile, readlink } from 'node:fs/promises';
import { GENERATED_MARKER } from '../shared/constants/output.ts';
import type { OutputRecord } from '../shared/types/state.ts';
import { getPathType, PathType } from '../shared/utils/fs.ts';
import { hashContent } from '../shared/utils/hash.ts';

/** What is on the disk at a path, without following a symlink. */
export type DiskEntry =
  | {
      type: typeof PathType.Missing;
    }
  | {
      type: typeof PathType.File;
      hash: string;
      /** The file starts with the marker of generated markdown files. */
      isMarked: boolean;
    }
  | {
      type: typeof PathType.Symlink;
      target: string;
    }
  | {
      type: typeof PathType.Directory;
    };

export async function inspectPath(path: string): Promise<DiskEntry> {
  const type = await getPathType(path);

  if (type === PathType.Symlink) {
    const target = await readlink(path);

    return {
      type,
      target,
    };
  }

  if (type === PathType.File) {
    const content = await readFile(path);
    const hash = hashContent(content);
    const start = content.subarray(0, GENERATED_MARKER.length);
    const isMarked = start.toString('utf8') === GENERATED_MARKER;

    return {
      type,
      hash,
      isMarked,
    };
  }

  return {
    type,
  };
}

/** A file matches a record by its hash, a symlink by its target. */
export function matchesRecord(entry: DiskEntry, record: OutputRecord): boolean {
  if (entry.type === PathType.File && 'hash' in record) {
    return entry.hash === record.hash;
  }

  if (entry.type === PathType.Symlink && 'target' in record) {
    return entry.target === record.target;
  }

  return false;
}

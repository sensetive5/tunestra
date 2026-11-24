import { TunestraError } from '../shared/errors/tunestra-error.ts';
import type { LockedSources } from '../shared/types/source.ts';
import { describeRepository, parseGitSource } from '../sources/parse-git-source.ts';

/** Every locked source, or the ones named on the command line. */
export type UpdateTarget = 'all' | ReadonlyArray<string>;

export type UpdateSelection = {
  /** Sources that keep their commit from the lock file. */
  kept: LockedSources;
  /** Sources that get the latest commit of their refs. */
  updated: ReadonlySet<string>;
};

/**
 * A source can be named as in `extends`, with a path, or as a repository:
 * `github:org/presets/team#v1` and `github:org/presets#v1` are the same source.
 */
export function selectUpdated(
  locked: LockedSources,
  target: UpdateTarget | undefined,
): UpdateSelection {
  const lockedKeys = Object.keys(locked);

  if (target === undefined) {
    return {
      kept: locked,
      updated: new Set(),
    };
  }

  if (target === 'all') {
    return {
      kept: {},
      updated: new Set(lockedKeys),
    };
  }

  const updated = new Set(target.map((name) => findLockedKey(name, lockedKeys)));
  const entries = Object.entries(locked);
  const keptEntries = entries.filter((entry) => {
    const key = entry[0];

    return updated.has(key) === false;
  });
  const kept = Object.fromEntries(keptEntries);

  return {
    kept,
    updated,
  };
}

function findLockedKey(name: string, lockedKeys: ReadonlyArray<string>): string {
  const source = parseGitSource(name);
  const key = source === undefined ? undefined : describeRepository(source);
  const isLocked = typeof key === 'string' && lockedKeys.includes(key);

  if (isLocked) {
    return key;
  }

  const known = lockedKeys.length === 0 ? 'none' : lockedKeys.join(', ');

  throw new TunestraError(`${name} is not in tunestra.lock.yaml. Locked sources: ${known}`);
}

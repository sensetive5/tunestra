import type { LockedSources } from '../shared/types/source.ts';

export const LockChangeKind = {
  Added: 'added',
  Moved: 'moved',
  /** `tunestra update` asked for the source, and its ref still points to the same commit. */
  Current: 'current',
  Removed: 'removed',
} as const;

export type LockChangeKind = (typeof LockChangeKind)[keyof typeof LockChangeKind];

type LockChangeOf<TKind extends LockChangeKind, TCommits extends object> = {
  kind: TKind;
  /** The repository with its ref: `github:org/presets#v1`. */
  source: string;
} & TCommits;

/** `from` is the commit before setup, `to` is the commit after it. */
export type LockChange =
  | LockChangeOf<typeof LockChangeKind.Added, { to: string }>
  | LockChangeOf<typeof LockChangeKind.Moved, { from: string; to: string }>
  | LockChangeOf<typeof LockChangeKind.Current, { to: string }>
  | LockChangeOf<typeof LockChangeKind.Removed, { from: string }>;

export type LockPlan = {
  sources: LockedSources;
  changes: ReadonlyArray<LockChange>;
  /** The file has to be written or removed; a fixed integrity counts too. */
  isChanged: boolean;
};

/** Compares the lock file with the sources that setup used. */
export function planLock(
  previous: LockedSources,
  next: LockedSources,
  updated: ReadonlySet<string>,
): LockPlan {
  const changes: Array<LockChange> = [];
  const nextEntries = Object.entries(next);

  for (const entry of nextEntries) {
    const source = entry[0];
    const locked = entry[1];
    const before = previous[source];
    const to = locked.commit;

    if (before === undefined) {
      changes.push({
        kind: LockChangeKind.Added,
        source,
        to,
      });

      continue;
    }

    const isSameCommit = before.commit === to;

    if (isSameCommit === false) {
      changes.push({
        kind: LockChangeKind.Moved,
        source,
        from: before.commit,
        to,
      });

      continue;
    }

    if (updated.has(source)) {
      changes.push({
        kind: LockChangeKind.Current,
        source,
        to,
      });
    }
  }

  const previousEntries = Object.entries(previous);

  for (const entry of previousEntries) {
    const source = entry[0];
    const before = entry[1];
    const isUsed = source in next;

    if (isUsed) {
      continue;
    }

    changes.push({
      kind: LockChangeKind.Removed,
      source,
      from: before.commit,
    });
  }

  const hasSameSources = checkSameSources(previous, next);

  return {
    sources: next,
    changes,
    isChanged: hasSameSources === false,
  };
}

function checkSameSources(previous: LockedSources, next: LockedSources): boolean {
  const previousKeys = Object.keys(previous);
  const nextEntries = Object.entries(next);
  const hasSameCount = previousKeys.length === nextEntries.length;
  const hasSameCommits = nextEntries.every((entry) => {
    const locked = entry[1];
    const before = previous[entry[0]];

    return before?.commit === locked.commit && before.integrity === locked.integrity;
  });

  return hasSameCount && hasSameCommits;
}

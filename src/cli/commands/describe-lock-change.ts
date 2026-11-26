import { type LockChange, LockChangeKind } from '../../lock/plan-lock.ts';
import { LOCK_FILE } from '../../shared/constants/files.ts';
import { buildCompareUrl } from '../../sources/build-compare-url.ts';
import { parseGitSource } from '../../sources/parse-git-source.ts';

const NO_CHANGES = 'No source changes.';

const TABLE_HEADER = ['| Source | Change |', '|---|---|'];

/** A source that `tunestra.lock.yaml` adds, moves or removes. */
type SourceChange = Exclude<LockChange, { kind: typeof LockChangeKind.Current }>;

/** A new kind without a case here does not compile: the function would miss a return. */
export function describeLockChange(change: LockChange): string {
  switch (change.kind) {
    case LockChangeKind.Added:
      return `Locked ${change.source} at ${shortenCommit(change.to)} in ${LOCK_FILE}.`;
    case LockChangeKind.Moved:
      return describeMove(change.source, change.from, change.to);
    case LockChangeKind.Current:
      return `${change.source} is already at the latest commit, ${shortenCommit(change.to)}.`;
    case LockChangeKind.Removed:
      return `Removed ${change.source} from ${LOCK_FILE}: no preset extends it now.`;
  }
}

/** A markdown table of the changed sources, for the pull request of an update. */
export function describeLockSummary(changes: ReadonlyArray<LockChange>): string {
  const changed = changes.filter(isSourceChange);

  if (changed.length === 0) {
    return NO_CHANGES;
  }

  const rows = changed.map((change) => {
    const cell = describeChangeCell(change);

    return `| \`${change.source}\` | ${cell} |`;
  });

  return [...TABLE_HEADER, ...rows].join('\n');
}

function isSourceChange(change: LockChange): change is SourceChange {
  return change.kind !== LockChangeKind.Current;
}

/** With a link to the changes, so that the reviewers of the update do not compare by hand. */
function describeMove(key: string, from: string, to: string): string {
  const fromShort = shortenCommit(from);
  const toShort = shortenCommit(to);
  const line = `Moved ${key} from ${fromShort} to ${toShort}.`;
  const url = findCompareUrl(key, from, to);

  if (url === undefined) {
    return line;
  }

  return `${line}\n  ${url}`;
}

/** A new kind without a case here does not compile: the function would miss a return. */
function describeChangeCell(change: SourceChange): string {
  switch (change.kind) {
    case LockChangeKind.Added:
      return `Added at ${shortenCommit(change.to)}`;
    case LockChangeKind.Moved:
      return describeMoveCell(change.source, change.from, change.to);
    case LockChangeKind.Removed:
      return 'Removed';
  }
}

function describeMoveCell(key: string, from: string, to: string): string {
  const fromShort = shortenCommit(from);
  const toShort = shortenCommit(to);
  const text = `${fromShort} → ${toShort}`;
  const url = findCompareUrl(key, from, to);

  if (url === undefined) {
    return text;
  }

  return `[${text}](${url})`;
}

/** `undefined` for a source that is not in git. */
function findCompareUrl(key: string, from: string, to: string): string | undefined {
  const source = parseGitSource(key);

  if (source === undefined) {
    return undefined;
  }

  return buildCompareUrl(source, from, to);
}

/** The first 7 characters, as git shows a commit. */
function shortenCommit(commit: string): string {
  return commit.slice(0, 7);
}

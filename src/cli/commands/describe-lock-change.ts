import { type LockChange, LockChangeKind } from '../../lock/plan-lock.ts';
import { LOCK_FILE } from '../../shared/constants/files.ts';
import { buildCompareUrl } from '../../sources/build-compare-url.ts';
import { parseGitSource } from '../../sources/parse-git-source.ts';

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

/** With a link to the changes, so that the reviewers of the update do not compare by hand. */
function describeMove(key: string, from: string, to: string): string {
  const fromShort = shortenCommit(from);
  const toShort = shortenCommit(to);
  const line = `Moved ${key} from ${fromShort} to ${toShort}.`;
  const source = parseGitSource(key);

  if (source === undefined) {
    return line;
  }

  const url = buildCompareUrl(source, from, to);

  return `${line}\n  ${url}`;
}

/** The first 7 characters, as git shows a commit. */
function shortenCommit(commit: string): string {
  return commit.slice(0, 7);
}

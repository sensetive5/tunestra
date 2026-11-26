import pc from 'picocolors';
import { type LockChange, LockChangeKind, type LockPlan } from '../../lock/plan-lock.ts';
import { runSetup, type SetupOptions } from '../../setup/run-setup.ts';
import { LOCK_FILE } from '../../shared/constants/files.ts';
import type { SetupPlan } from '../../shared/types/output.ts';
import { buildCompareUrl } from '../../sources/build-compare-url.ts';
import { parseGitSource } from '../../sources/parse-git-source.ts';
import type { SyncPlan } from '../../sync/plan-sync.ts';
import { describeResolution } from './describe-resolution.ts';

export type SetupCommandOptions = SetupOptions & {
  /** Also print where every artifact comes from. */
  verbose: boolean;
};

export async function describeSetup(
  projectDir: string,
  options: SetupCommandOptions,
): Promise<string> {
  const report = await runSetup(projectDir, options);
  const summary = describeSync(report.plan, report.sync, report.lock, options);

  if (options.verbose) {
    const resolution = describeResolution(report.resolution);

    return `${resolution}

${summary}`;
  }

  return summary;
}

function describeSync(
  plan: SetupPlan,
  sync: SyncPlan,
  lock: LockPlan,
  options: SetupOptions,
): string {
  const warningIcon = pc.yellow('⚠');
  const lines = sync.warnings.map((warning) => `${warningIcon} ${warning}`);
  const noteIcon = pc.cyan('ℹ');
  const lockNotes = lock.changes.map(describeLockChange);
  const notes = [...lockNotes, ...plan.notes].map((note) => `${noteIcon} ${note}`);
  const writeCount = sync.outputs.length;
  const removeCount = sync.removals.length;

  if (options.dryRun) {
    const writes = sync.outputs.map((output) => `  write   ${output.path}`);
    const removals = sync.removals.map((path) => `  remove  ${path}`);

    lines.push(...writes, ...removals, ...notes, '', 'Nothing was written (--dry-run).');

    return lines.join('\n');
  }

  const check = pc.green('✔');
  const hasLockFile = Object.keys(lock.sources).length > 0;
  const committedPaths = hasLockFile ? [...plan.protectedPaths, LOCK_FILE] : plan.protectedPaths;
  const committedFiles = joinList(committedPaths);

  lines.push(`${check} Generated ${writeCount} files, removed ${removeCount} stale files.`);
  lines.push(...notes);
  lines.push(`Commit ${committedFiles}; the rest is in .gitignore.`);

  return lines.join('\n');
}

/** A new kind without a case here does not compile: the function would miss a return. */
function describeLockChange(change: LockChange): string {
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

/** For example `AGENTS.md, CLAUDE.md and .claude/settings.json`. */
function joinList(items: ReadonlyArray<string>): string {
  const last = items.at(-1) ?? '';
  const rest = items.slice(0, -1);

  if (rest.length === 0) {
    return last;
  }

  const head = rest.join(', ');

  return `${head} and ${last}`;
}

import pc from 'picocolors';
import { runSetup, type SetupOptions } from '../../setup/run-setup.ts';
import type { SetupPlan } from '../../shared/types/output.ts';
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
  const summary = describeSync(report.plan, report.sync, options);

  if (options.verbose) {
    const resolution = describeResolution(report.resolution);

    return `${resolution}

${summary}`;
  }

  return summary;
}

function describeSync(plan: SetupPlan, sync: SyncPlan, options: SetupOptions): string {
  const warningIcon = pc.yellow('⚠');
  const lines = sync.warnings.map((warning) => `${warningIcon} ${warning}`);
  const noteIcon = pc.cyan('ℹ');
  const notes = plan.notes.map((note) => `${noteIcon} ${note}`);
  const writeCount = sync.outputs.length;
  const removeCount = sync.removals.length;

  if (options.dryRun) {
    const writes = sync.outputs.map((output) => `  write   ${output.path}`);
    const removals = sync.removals.map((path) => `  remove  ${path}`);

    lines.push(...writes, ...removals, ...notes, '', 'Nothing was written (--dry-run).');

    return lines.join('\n');
  }

  const check = pc.green('✔');
  const committedFiles = joinList(plan.protectedPaths);

  lines.push(`${check} Generated ${writeCount} files, removed ${removeCount} stale files.`);
  lines.push(...notes);
  lines.push(`Commit ${committedFiles}; the rest is in .gitignore.`);

  return lines.join('\n');
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

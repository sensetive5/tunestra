import pc from 'picocolors';
import { runSetup, type SetupOptions } from '../setup/run-setup.ts';
import { TunestraError } from '../shared/errors/tunestra-error.ts';
import type { SyncPlan } from '../sync/plan-sync.ts';

/** Prints the result for people; an error in the user's input is shown without a stack. */
export async function runSetupCommand(projectDir: string, options: SetupOptions): Promise<void> {
  try {
    const sync = await runSetup(projectDir, options);
    const report = describeSync(sync, options);

    console.log(report);
  } catch (error) {
    if (error instanceof TunestraError) {
      const message = pc.red(error.message);

      console.error(message);
      process.exitCode = 1;

      return;
    }

    throw error;
  }
}

function describeSync(sync: SyncPlan, options: SetupOptions): string {
  const warningIcon = pc.yellow('⚠');
  const lines = sync.warnings.map((warning) => `${warningIcon} ${warning}`);
  const writeCount = sync.outputs.length;
  const removeCount = sync.removals.length;

  if (options.dryRun) {
    const writes = sync.outputs.map((output) => `  write   ${output.path}`);
    const removals = sync.removals.map((path) => `  remove  ${path}`);

    lines.push(...writes, ...removals, '', 'Nothing was written (--dry-run).');

    return lines.join('\n');
  }

  const check = pc.green('✔');

  lines.push(`${check} Generated ${writeCount} files, removed ${removeCount} stale files.`);
  lines.push('Commit AGENTS.md and CLAUDE.md; the rest is in .gitignore.');

  return lines.join('\n');
}

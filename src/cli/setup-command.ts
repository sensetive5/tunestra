import pc from 'picocolors';
import { TunestraError } from '../errors.ts';
import { runSetup, type SetupOptions } from '../setup/run-setup.ts';
import type { SetupPlan } from '../shared/types/output.ts';

/** Prints the result for people; an error in the user's input is shown without a stack. */
export async function runSetupCommand(projectDir: string, options: SetupOptions): Promise<void> {
  try {
    const plan = await runSetup(projectDir, options);
    const summary = describePlan(plan, options);

    console.log(summary);
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

function describePlan(plan: SetupPlan, options: SetupOptions): string {
  const count = plan.outputs.length;

  if (options.dryRun) {
    const paths = plan.outputs.map((output) => `  ${output.path}`);
    const list = paths.join('\n');

    return `Would write ${count} files:\n${list}\n\nNothing was written (--dry-run).`;
  }

  const check = pc.green('✔');

  return `${check} Generated ${count} files. Commit AGENTS.md and CLAUDE.md; the rest is in .gitignore.`;
}

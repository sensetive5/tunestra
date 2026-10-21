import { loadChain } from '../chain/load-chain.ts';
import { planSetup } from '../generate/plan-setup.ts';
import { applyInheritance } from '../inheritance/apply-inheritance.ts';
import type { SetupPlan } from '../shared/types/output.ts';
import { checkProtectedFiles } from './check-protected-files.ts';
import { updateGitignoreFile } from './update-gitignore-file.ts';
import { writeOutputs } from './write-outputs.ts';

export type SetupOptions = {
  /** Build the plan, but do not write anything. */
  dryRun: boolean;
};

/** Loads the chain, resolves inheritance and writes the configuration of every agent. */
export async function runSetup(projectDir: string, options: SetupOptions): Promise<SetupPlan> {
  const chain = await loadChain(projectDir);
  const resolution = applyInheritance(chain);
  const plan = planSetup(resolution);

  if (options.dryRun) {
    return plan;
  }

  await checkProtectedFiles(chain.project.dir, plan.protectedPaths);
  await writeOutputs(chain.project.dir, plan.outputs);
  await updateGitignoreFile(chain.project.dir, plan.ignoredPaths);

  return plan;
}

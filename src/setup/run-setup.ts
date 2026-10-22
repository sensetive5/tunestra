import { loadChain } from '../chain/load-chain.ts';
import { planSetup } from '../generate/plan-setup.ts';
import { applyInheritance } from '../inheritance/apply-inheritance.ts';
import { readState } from '../state/read-state.ts';
import { applySync } from '../sync/apply-sync.ts';
import { planSync, type SyncPlan } from '../sync/plan-sync.ts';
import { updateGitignoreFile } from './update-gitignore-file.ts';

export type SetupOptions = {
  /** Build the plan and compare it with the disk, but do not write anything. */
  dryRun: boolean;
};

/**
 * Loads the chain, resolves inheritance, compares the outputs with the last setup and
 * writes the configuration of every agent.
 */
export async function runSetup(projectDir: string, options: SetupOptions): Promise<SyncPlan> {
  const chain = await loadChain(projectDir);
  const resolution = applyInheritance(chain);
  const plan = planSetup(resolution);
  const previous = await readState(chain.project.dir);
  const sync = await planSync(chain.project.dir, plan, previous);

  if (options.dryRun) {
    return sync;
  }

  await applySync(chain.project.dir, sync);
  await updateGitignoreFile(chain.project.dir, plan.ignoredPaths);

  return sync;
}

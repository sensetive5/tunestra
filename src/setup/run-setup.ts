import { loadChain } from '../chain/load-chain.ts';
import { loadLocalChain } from '../chain/load-local-chain.ts';
import { planSetup } from '../generate/plan-setup.ts';
import { applyInheritance } from '../inheritance/apply-inheritance.ts';
import type { SetupPlan } from '../shared/types/output.ts';
import type { Resolution } from '../shared/types/resolution.ts';
import { readState } from '../state/read-state.ts';
import { applySync } from '../sync/apply-sync.ts';
import { planSync, type SyncPlan } from '../sync/plan-sync.ts';
import { updateGitignoreFile } from './update-gitignore-file.ts';

export type SetupReport = {
  /** With the personal level, when the project has one. */
  resolution: Resolution;
  plan: SetupPlan;
  sync: SyncPlan;
};

export type SetupOptions = {
  /** Build the plan and compare it with the disk, but do not write anything. */
  dryRun: boolean;
};

/**
 * Loads the chain, resolves inheritance, compares the outputs with the last setup and
 * writes the configuration of every agent.
 */
export async function runSetup(projectDir: string, options: SetupOptions): Promise<SetupReport> {
  const chain = await loadChain(projectDir);
  const localChain = await loadLocalChain(chain);
  const sharedResolution = applyInheritance(chain);
  const localResolution = localChain === undefined ? undefined : applyInheritance(localChain);
  const resolution = localResolution ?? sharedResolution;
  const plan = planSetup(sharedResolution, localResolution);
  const previous = await readState(chain.project.dir);
  const sync = await planSync(chain.project.dir, plan, previous);

  const report = {
    resolution,
    plan,
    sync,
  };

  if (options.dryRun) {
    return report;
  }

  await applySync(chain.project.dir, sync);
  await updateGitignoreFile(chain.project.dir, plan.ignoredPaths);

  return report;
}

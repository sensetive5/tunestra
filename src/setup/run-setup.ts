import { resolve } from 'node:path';
import { loadChain } from '../chain/load-chain.ts';
import { loadLocalChain } from '../chain/load-local-chain.ts';
import { planSetup } from '../generate/plan-setup.ts';
import { applyInheritance } from '../inheritance/apply-inheritance.ts';
import { type LockPlan, planLock } from '../lock/plan-lock.ts';
import { readLock } from '../lock/read-lock.ts';
import { selectUpdated, type UpdateTarget } from '../lock/select-updated.ts';
import { writeLockFile } from '../lock/write-lock-file.ts';
import type { SetupPlan } from '../shared/types/output.ts';
import type { Resolution } from '../shared/types/resolution.ts';
import type { DownloadRepository, ResolveCommit } from '../shared/types/source.ts';
import { createSourceResolver } from '../sources/create-source-resolver.ts';
import { readState } from '../state/read-state.ts';
import { applySync } from '../sync/apply-sync.ts';
import { planSync, type SyncPlan } from '../sync/plan-sync.ts';
import { updateGitignoreFile } from './update-gitignore-file.ts';

export type SetupReport = {
  /** With the personal level, when the project has one. */
  resolution: Resolution;
  plan: SetupPlan;
  sync: SyncPlan;
  lock: LockPlan;
};

export type SetupOptions = {
  /** Build the plan and compare it with the disk, but do not write anything. */
  dryRun: boolean;
  /** Git sources to move to the latest commit of their refs, for `tunestra update`. */
  update?: UpdateTarget;
  /** Replaces the download of git sources, for tests. */
  download?: DownloadRepository;
  /** Replaces the API of the providers, for tests. */
  resolveCommit?: ResolveCommit;
};

/**
 * Loads the chain, resolves inheritance, compares the outputs with the last setup and
 * writes the configuration of every agent.
 */
export async function runSetup(projectDir: string, options: SetupOptions): Promise<SetupReport> {
  const root = resolve(projectDir);
  const previousLock = await readLock(root);
  const selection = selectUpdated(previousLock, options.update);
  const resolver = createSourceResolver(root, {
    download: options.download,
    resolveCommit: options.resolveCommit,
    locked: selection.kept,
    locksNewSources: true,
  });
  const chain = await loadChain(root, { resolver });
  const locked = resolver.listLocked();
  // The personal level is not committed, so its own sources stay out of the lock file.
  const localResolver = createSourceResolver(root, {
    download: options.download,
    locked,
  });
  const localChain = await loadLocalChain(chain, { resolver: localResolver });
  const lock = planLock(previousLock, locked, selection.updated);
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
    lock,
  };

  if (options.dryRun) {
    return report;
  }

  await applySync(chain.project.dir, sync);
  await updateGitignoreFile(chain.project.dir, plan.ignoredPaths);

  if (lock.isChanged) {
    await writeLockFile(chain.project.dir, lock.sources);
  }

  return report;
}

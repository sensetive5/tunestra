import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { writeOutputs } from '../setup/write-outputs.ts';
import { PROJECT_DIR } from '../shared/constants/files.ts';
import { STATE_DIR } from '../shared/constants/output.ts';
import { removeDirIfEmpty } from '../shared/utils/fs.ts';
import { isString } from '../shared/utils/guards.ts';
import { mapSettled } from '../shared/utils/settled.ts';
import { readState } from '../state/read-state.ts';
import { checkStaleOutput } from '../sync/check-stale-output.ts';
import { planMerges } from '../sync/plan-merges.ts';
import { removeOutputs } from '../sync/remove-outputs.ts';
import { removeGitignoreBlockFile } from './remove-gitignore-block.ts';

export type UninstallOptions = {
  /** Show what would be removed, but remove nothing. */
  dryRun: boolean;
};

export type UninstallReport = {
  removals: ReadonlyArray<string>;
  /** Settings files of people that setup added entries to; the entries are taken out. */
  updates: ReadonlyArray<string>;
  warnings: ReadonlyArray<string>;
};

/**
 * Removes everything that the last setup generated, the block in .gitignore and
 * .tunestra/state/. The sources, tunestra.yaml and .tunestra/, stay.
 */
export async function runUninstall(
  projectDir: string,
  options: UninstallOptions,
): Promise<UninstallReport> {
  const state = await readState(projectDir);
  const entries = Object.entries(state.outputs);
  const checks = await mapSettled(entries, ([path, record]) =>
    checkStaleOutput(projectDir, path, record),
  );
  const removable = checks.filter((check) => check.isRemovable);
  const mergePlan = await planMerges(projectDir, [], state.merges);
  const outputRemovals = removable.map((check) => check.path);
  const removals = [...outputRemovals, ...mergePlan.removals];
  const updates = mergePlan.writes.map((write) => write.path);
  const warnings = checks.map((check) => check.warning).filter(isString);
  const report = {
    removals,
    updates,
    warnings,
  };

  if (options.dryRun) {
    return report;
  }

  const stateDir = join(projectDir, STATE_DIR);
  const tunestraDir = join(projectDir, PROJECT_DIR);

  await removeOutputs(projectDir, removals);
  await writeOutputs(projectDir, mergePlan.writes);
  await removeGitignoreBlockFile(projectDir);
  await rm(stateDir, {
    recursive: true,
    force: true,
  });
  // Setup creates .tunestra/ for its state; without the user's sources it is not needed.
  await removeDirIfEmpty(tunestraDir);

  return report;
}

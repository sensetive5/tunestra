import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECT_DIR } from '../shared/constants/files.ts';
import { STATE_DIR } from '../shared/constants/output.ts';
import { removeDirIfEmpty } from '../shared/utils/fs.ts';
import { isString } from '../shared/utils/guards.ts';
import { mapSettled } from '../shared/utils/settled.ts';
import { readState } from '../state/read-state.ts';
import { checkStaleOutput } from '../sync/check-stale-output.ts';
import { removeOutputs } from '../sync/remove-outputs.ts';
import { removeGitignoreBlockFile } from './remove-gitignore-block.ts';

export type UninstallOptions = {
  /** Show what would be removed, but remove nothing. */
  dryRun: boolean;
};

export type UninstallReport = {
  removals: ReadonlyArray<string>;
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
  const removals = removable.map((check) => check.path);
  const warnings = checks.map((check) => check.warning).filter(isString);

  if (options.dryRun) {
    return {
      removals,
      warnings,
    };
  }

  const stateDir = join(projectDir, STATE_DIR);
  const tunestraDir = join(projectDir, PROJECT_DIR);

  await removeOutputs(projectDir, removals);
  await removeGitignoreBlockFile(projectDir);
  await rm(stateDir, {
    recursive: true,
    force: true,
  });
  // Setup creates .tunestra/ for its state; without the user's sources it is not needed.
  await removeDirIfEmpty(tunestraDir);

  return {
    removals,
    warnings,
  };
}

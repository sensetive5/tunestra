import { STATE_VERSION } from '../shared/constants/output.ts';
import type { Output, SetupPlan } from '../shared/types/output.ts';
import type { OutputRecord, SetupState } from '../shared/types/state.ts';
import { isString } from '../shared/utils/guards.ts';
import { mapSettled } from '../shared/utils/settled.ts';
import { checkOutput } from './check-output.ts';
import { checkStaleOutput } from './check-stale-output.ts';

/** What setup will do on the disk, after comparing the plan with the last setup. */
export type SyncPlan = {
  outputs: ReadonlyArray<Output>;
  /** Paths that the last setup wrote, that are not needed now and were not edited. */
  removals: ReadonlyArray<string>;
  warnings: ReadonlyArray<string>;
  /** The state to save after writing. */
  state: SetupState;
};

/** Reads the disk, but writes nothing; problems of every output are reported together. */
export async function planSync(
  projectDir: string,
  plan: SetupPlan,
  previous: SetupState,
): Promise<SyncPlan> {
  const context = {
    projectDir,
    previous,
    protectedPaths: plan.protectedPaths,
  };
  const paths = plan.outputs.map((output) => output.path);
  const outputPaths = new Set(paths);
  const previousEntries = Object.entries(previous.outputs);
  const staleEntries = previousEntries.filter(([path]) => outputPaths.has(path) === false);

  const outputChecks = await mapSettled(plan.outputs, (output) => checkOutput(output, context));
  const staleChecks = await mapSettled(staleEntries, ([path, record]) =>
    checkStaleOutput(projectDir, path, record),
  );

  const removals = staleChecks.filter((check) => check.isRemovable).map((check) => check.path);
  const checks = [...outputChecks, ...staleChecks];
  const warnings = checks.map((check) => check.warning).filter(isString);
  const recordEntries = outputChecks.map((check): [string, OutputRecord] => [
    check.path,
    check.record,
  ]);
  const records = Object.fromEntries(recordEntries);
  const state = {
    version: STATE_VERSION,
    outputs: records,
  };

  return {
    outputs: plan.outputs,
    removals,
    warnings,
    state,
  };
}

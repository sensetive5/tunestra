import { writeOutputs } from '../setup/write-outputs.ts';
import { writeState } from '../state/write-state.ts';
import type { SyncPlan } from './plan-sync.ts';
import { removeOutputs } from './remove-outputs.ts';

/** Removes stale outputs first, so that a file can become a directory and back. */
export async function applySync(projectDir: string, sync: SyncPlan): Promise<void> {
  await removeOutputs(projectDir, sync.removals);
  await writeOutputs(projectDir, sync.outputs);
  await writeState(projectDir, sync.state);
}

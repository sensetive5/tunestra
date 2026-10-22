import { join } from 'node:path';
import { TunestraError } from '../errors.ts';
import { STATE_FILE, STATE_VERSION } from '../shared/constants/output.ts';
import type { SetupState } from '../shared/types/state.ts';
import { getErrorMessage } from '../shared/utils/errors.ts';
import { readFileIfExists } from '../shared/utils/fs.ts';
import { validate } from '../shared/utils/validate.ts';
import { stateSchema } from './state-schema.ts';

/** The state of the last setup; a project that never ran setup has an empty one. */
export async function readState(projectDir: string): Promise<SetupState> {
  const file = join(projectDir, STATE_FILE);
  const content = await readFileIfExists(file);

  if (content === undefined) {
    return createEmptyState();
  }

  const data = parseJson(content, file);

  return validate(data, stateSchema, `state file ${file}. Delete it and run tunestra setup again`);
}

export function createEmptyState(): SetupState {
  return {
    version: STATE_VERSION,
    outputs: {},
  };
}

function parseJson(content: string, file: string): unknown {
  try {
    return JSON.parse(content);
  } catch (error) {
    const reason = getErrorMessage(error);

    throw new TunestraError(
      `Invalid state file ${file}: ${reason}. Delete it and run tunestra setup again`,
    );
  }
}

import { join } from 'node:path';
import { TunestraError } from '../errors.ts';
import type { Output } from '../shared/types/output.ts';
import type { OutputRecord, SetupState } from '../shared/types/state.ts';
import { PathType } from '../shared/utils/fs.ts';
import { createRecord } from './create-record.ts';
import { type DiskEntry, inspectPath, matchesRecord } from './inspect-path.ts';

export type OutputCheck = {
  path: string;
  record: OutputRecord;
  warning: string | undefined;
};

export type OutputCheckContext = {
  projectDir: string;
  previous: SetupState;
  protectedPaths: ReadonlyArray<string>;
};

/**
 * Compares an output with the disk and the last setup. A file that tunestra wrote and
 * someone edited is replaced with a warning; a file that tunestra never wrote stops setup.
 */
export async function checkOutput(
  output: Output,
  context: OutputCheckContext,
): Promise<OutputCheck> {
  const path = join(context.projectDir, output.path);
  const record = await createRecord(output);
  const disk = await inspectPath(path);
  const previousRecord = context.previous.outputs[output.path];
  const isUnchanged = isSafeToWrite(disk, record, previousRecord);

  if (isUnchanged) {
    return createCheck(output, record, undefined);
  }

  const isRecorded = typeof previousRecord === 'object';
  const isReplaceable = disk.type === PathType.File || disk.type === PathType.Symlink;

  if (isRecorded && isReplaceable) {
    const warning = `${output.path} was edited by hand; tunestra replaced it. Edit ${output.source} instead`;

    return createCheck(output, record, warning);
  }

  const isProtected = context.protectedPaths.includes(output.path);

  if (isProtected) {
    throw new TunestraError(
      `${output.path} was written by hand, and setup would overwrite it. Move its text to .tunestra/AGENTS.md or to a rule in .tunestra/rules/, then delete ${output.path} and run tunestra setup again`,
    );
  }

  throw new TunestraError(
    `${output.path} already exists, and tunestra did not create it. Move it away and run tunestra setup again`,
  );
}

/**
 * Nothing to lose: the path is empty, already has the new content, still has what tunestra
 * wrote last time, or is a generated markdown file whose record was lost.
 */
function isSafeToWrite(
  disk: DiskEntry,
  record: OutputRecord,
  previousRecord: OutputRecord | undefined,
): boolean {
  if (disk.type === PathType.Missing) {
    return true;
  }

  const matchesNew = matchesRecord(disk, record);

  if (matchesNew) {
    return true;
  }

  if (previousRecord === undefined) {
    return disk.type === PathType.File && disk.isMarked;
  }

  return matchesRecord(disk, previousRecord);
}

function createCheck(
  output: Output,
  record: OutputRecord,
  warning: string | undefined,
): OutputCheck {
  return {
    path: output.path,
    record,
    warning,
  };
}

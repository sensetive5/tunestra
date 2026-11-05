import { join } from 'node:path';
import { OutputKind } from '../shared/constants/output.ts';
import { TunestraError } from '../shared/errors/tunestra-error.ts';
import type { JsonOwnership, Output } from '../shared/types/output.ts';
import type { OutputRecord, SetupState } from '../shared/types/state.ts';
import { PathType } from '../shared/utils/fs.ts';
import { createRecord } from './create-record.ts';
import { findForeignKeys } from './find-foreign-keys.ts';
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

  const ownership = output.kind === OutputKind.File ? output.ownership : undefined;

  if (typeof ownership === 'object' && disk.type === PathType.File) {
    const warning = await checkOwnedJson(path, output, ownership);

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

/** Takes over a JSON file with only the keys that tunestra writes; other keys stop setup. */
async function checkOwnedJson(
  path: string,
  output: Output,
  ownership: JsonOwnership,
): Promise<string> {
  const foreignKeys = await findForeignKeys(path, ownership.keys);

  if (foreignKeys === undefined) {
    throw new TunestraError(
      `${output.path} is not a JSON object, and setup would overwrite it. Fix or delete it and run tunestra setup again`,
    );
  }

  const hasForeignKeys = foreignKeys.length > 0;

  if (hasForeignKeys) {
    const keys = foreignKeys.join(', ');

    throw new TunestraError(
      `${output.path} has settings that tunestra does not write: ${keys}. Move them to ${ownership.otherKeysTarget}, then run tunestra setup again`,
    );
  }

  return `${output.path} had only the settings that tunestra writes; tunestra replaced it. Edit ${output.source} instead`;
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

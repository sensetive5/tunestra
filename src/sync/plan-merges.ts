import { join } from 'node:path';
import { getErrorMessage } from '../shared/errors/get-error-message.ts';
import { TunestraError } from '../shared/errors/tunestra-error.ts';
import type { OutputFile, SettingsEntries, SettingsMerge } from '../shared/types/output.ts';
import { readFileIfExists } from '../shared/utils/fs.ts';
import { isKeyValueMap } from '../shared/utils/guards.ts';
import { createFileOutput } from '../shared/utils/outputs.ts';
import { mapSettled } from '../shared/utils/settled.ts';
import { mergeSettings } from './merge-settings.ts';

/** What setup does with the settings files of people. */
export type MergePlan = {
  /** Files with the new entries; files that would not change are left out. */
  writes: ReadonlyArray<OutputFile>;
  /** Files that had only the entries of setup. */
  removals: ReadonlyArray<string>;
  /** The entries to remember for the next setup. */
  records: Readonly<Record<string, SettingsEntries>>;
};

type MergeStep = {
  path: string;
  source: string;
  next: SettingsEntries | undefined;
};

type MergeResult = {
  write: OutputFile | undefined;
  removal: string | undefined;
};

/**
 * Adds the entries of every merge to its file and takes the entries of the last setup out,
 * also from files that this setup does not merge into any more. Reads the disk only.
 */
export async function planMerges(
  projectDir: string,
  merges: ReadonlyArray<SettingsMerge>,
  previous: Readonly<Record<string, SettingsEntries>>,
): Promise<MergePlan> {
  const paths = new Set(merges.map((merge) => merge.path));
  const previousPaths = Object.keys(previous);
  const stalePaths = previousPaths.filter((path) => paths.has(path) === false);
  const nextSteps = merges.map((merge) => ({
    path: merge.path,
    source: merge.source,
    next: merge.entries,
  }));
  const staleSteps = stalePaths.map((path) => ({
    path,
    source: 'the last setup',
    next: undefined,
  }));
  const steps = [...nextSteps, ...staleSteps];
  const results = await mapSettled(steps, (step) => planMerge(projectDir, step, previous));
  const writes = results.map((result) => result.write).filter((write) => write !== undefined);
  const removals = results
    .map((result) => result.removal)
    .filter((removal) => removal !== undefined);
  const recordEntries = merges.map((merge) => [merge.path, merge.entries]);
  const records = Object.fromEntries(recordEntries);

  return {
    writes,
    removals,
    records,
  };
}

async function planMerge(
  projectDir: string,
  step: MergeStep,
  previous: Readonly<Record<string, SettingsEntries>>,
): Promise<MergeResult> {
  const file = join(projectDir, step.path);
  const content = await readFileIfExists(file);
  const current = content === undefined ? {} : parseSettings(content, step.path);
  const merged = mergeSettings(current, previous[step.path], step.next);
  const isEmpty = Object.keys(merged).length === 0;
  const isUnchanged = JSON.stringify(merged) === JSON.stringify(current);

  if (isEmpty) {
    const removal = content === undefined ? undefined : step.path;

    return {
      write: undefined,
      removal,
    };
  }

  if (isUnchanged && content !== undefined) {
    return {
      write: undefined,
      removal: undefined,
    };
  }

  const json = JSON.stringify(merged, null, 2);
  const write = createFileOutput(step.path, `${json}\n`, step.source);

  return {
    write,
    removal: undefined,
  };
}

function parseSettings(content: string, path: string): Readonly<Record<string, unknown>> {
  const data = parseJson(content, path);

  if (isKeyValueMap(data) === false) {
    throw new TunestraError(
      `${path} is not a JSON object, so setup cannot add its settings. Fix or delete it and run tunestra setup again`,
    );
  }

  return data;
}

function parseJson(content: string, path: string): unknown {
  try {
    return JSON.parse(content);
  } catch (error) {
    const reason = getErrorMessage(error);

    throw new TunestraError(
      `${path} is not valid JSON: ${reason}. Fix or delete it and run tunestra setup again`,
    );
  }
}

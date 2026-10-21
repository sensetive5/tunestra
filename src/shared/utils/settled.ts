import { createProblemsError, TunestraError } from '../../errors.ts';

type SettledResults<T extends ReadonlyArray<unknown>> = {
  [K in keyof T]: PromiseSettledResult<T[K]>;
};

type FulfilledResults<T extends ReadonlyArray<unknown>> = {
  [K in keyof T]: PromiseFulfilledResult<T[K]>;
};

export function isFulfilled<T>(
  result: PromiseSettledResult<T>,
): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled';
}

/** Narrows the results of `Promise.allSettled`, tuples included, to fulfilled ones. */
export function isEveryFulfilled<T extends ReadonlyArray<unknown>>(
  results: SettledResults<T>,
): results is FulfilledResults<T> {
  return results.every(isFulfilled);
}

export function getValues<T>(results: ReadonlyArray<PromiseFulfilledResult<T>>): Array<T> {
  return results.map((result) => result.value);
}

/**
 * Builds one error from every rejected result, in the order of the results, so the message
 * does not depend on which promise settles first. An error that is not caused by the user's
 * input is returned as is.
 */
export function buildResultsError(results: ReadonlyArray<PromiseSettledResult<unknown>>): unknown {
  const problems: Array<string> = [];

  for (const result of results) {
    if (isFulfilled(result)) {
      continue;
    }

    const reason: unknown = result.reason;

    if (reason instanceof TunestraError) {
      problems.push(...reason.problems);
      continue;
    }

    return reason;
  }

  return createProblemsError(problems);
}

import { describe, expect, it } from 'vitest';
import { TunestraError } from '../../../errors.ts';
import { buildResultsError, getValues, isEveryFulfilled } from '../settled.ts';

describe('isEveryFulfilled', () => {
  it('is true when every promise is fulfilled', async () => {
    const results = await Promise.allSettled([Promise.resolve(1), Promise.resolve('a')]);

    const isFulfilled = isEveryFulfilled(results);

    expect(isFulfilled).toBe(true);
  });

  it('is false when one promise is rejected', async () => {
    const rejection = Promise.reject(new TunestraError('Broken'));
    const results = await Promise.allSettled([Promise.resolve(1), rejection]);

    const isFulfilled = isEveryFulfilled(results);

    expect(isFulfilled).toBe(false);
  });
});

describe('getValues', () => {
  it('keeps the order of the results', async () => {
    const results = await Promise.allSettled([Promise.resolve(1), Promise.resolve(2)]);
    const fulfilled = results.filter((result) => result.status === 'fulfilled');

    const values = getValues(fulfilled);

    expect(values).toEqual([1, 2]);
  });
});

describe('buildResultsError', () => {
  it('collects problems in the order of the results', async () => {
    const first = Promise.reject(new TunestraError('First'));
    const second = Promise.reject(new TunestraError('Second'));
    const results = await Promise.allSettled([second, Promise.resolve(1), first]);

    const error = buildResultsError(results);

    expect(error).toBeInstanceOf(TunestraError);
    expect(error).toMatchObject({
      problems: ['Second', 'First'],
    });
  });

  it('returns an unexpected error as is', async () => {
    const unexpected = new Error('EACCES');
    const rejection = Promise.reject(unexpected);
    const results = await Promise.allSettled([rejection]);

    const error = buildResultsError(results);

    expect(error).toBe(unexpected);
  });
});

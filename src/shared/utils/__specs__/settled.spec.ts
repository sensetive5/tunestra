import { describe, expect, it } from 'vitest';
import { TunestraError } from '../../../errors.ts';
import { buildResultsError, getValues, isEveryFulfilled, mapSettled } from '../settled.ts';

describe('isEveryFulfilled', () => {
  it('is true when every promise is fulfilled', async () => {
    const number = Promise.resolve(1);
    const text = Promise.resolve('a');
    const results = await Promise.allSettled([number, text]);

    const isFulfilled = isEveryFulfilled(results);

    expect(isFulfilled).toBe(true);
  });

  it('is false when one promise is rejected', async () => {
    const number = Promise.resolve(1);
    const error = new TunestraError('Broken');
    const rejection = Promise.reject(error);
    const results = await Promise.allSettled([number, rejection]);

    const isFulfilled = isEveryFulfilled(results);

    expect(isFulfilled).toBe(false);
  });
});

describe('getValues', () => {
  it('keeps the order of the results', async () => {
    const first = Promise.resolve(1);
    const second = Promise.resolve(2);
    const results = await Promise.allSettled([first, second]);
    const fulfilled = results.filter((result) => result.status === 'fulfilled');

    const values = getValues(fulfilled);

    expect(values).toEqual([1, 2]);
  });
});

describe('buildResultsError', () => {
  it('collects problems in the order of the results', async () => {
    const firstError = new TunestraError('First');
    const secondError = new TunestraError('Second');
    const first = Promise.reject(firstError);
    const second = Promise.reject(secondError);
    const success = Promise.resolve(1);
    const results = await Promise.allSettled([second, success, first]);

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

describe('mapSettled', () => {
  it('returns the values in the order of the items', async () => {
    const items = [3, 1, 2];

    const values = await mapSettled(items, async (item) => item * 10);

    expect(values).toEqual([30, 10, 20]);
  });

  it('reports the problems of every failed item', async () => {
    const items = ['a', 'b', 'c'];
    const acceptOnlyB = async (item: string): Promise<string> => {
      if (item === 'b') {
        return item;
      }

      throw new TunestraError(`Bad ${item}`);
    };

    const result = mapSettled(items, acceptOnlyB);

    await expect(result).rejects.toMatchObject({
      problems: ['Bad a', 'Bad c'],
    });
  });
});

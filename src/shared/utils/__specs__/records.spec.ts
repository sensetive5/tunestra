import { describe, expect, it } from 'vitest';
import { mergeRecords } from '../records.ts';

describe('mergeRecords', () => {
  it('lets the patch win on the same key', () => {
    const base = {
      A: '1',
      B: '2',
    };
    const patch = {
      B: '3',
    };

    const merged = mergeRecords(base, patch);

    expect(merged).toEqual({
      A: '1',
      B: '3',
    });
  });

  it('stays missing when both sides are missing', () => {
    const base = undefined;
    const patch = undefined;

    const merged = mergeRecords(base, patch);

    expect(merged).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { isKeyValueMap, isString } from '../guards.ts';

describe('isString', () => {
  it.each([
    ['a string', 'text', true],
    ['an empty string', '', true],
    ['a number', 42, false],
    ['undefined', undefined, false],
  ])('%s → %s', (_, value, expected) => {
    const result = isString(value);

    expect(result).toBe(expected);
  });
});

describe('isKeyValueMap', () => {
  it.each([
    ['an object', { a: 1 }, true],
    ['an empty object', {}, true],
    ['an array', [1, 2], false],
    ['null', null, false],
    ['a string', 'text', false],
    ['a number', 42, false],
  ])('%s → %s', (_, value, expected) => {
    const result = isKeyValueMap(value);

    expect(result).toBe(expected);
  });
});

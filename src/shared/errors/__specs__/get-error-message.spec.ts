import { describe, expect, it } from 'vitest';
import { getErrorMessage } from '../get-error-message.ts';

describe('getErrorMessage', () => {
  it('returns the message of an Error', () => {
    const error = new Error('Broken');

    const message = getErrorMessage(error);

    expect(message).toBe('Broken');
  });

  it('turns anything else into a string', () => {
    const thrown = 42;

    const message = getErrorMessage(thrown);

    expect(message).toBe('42');
  });
});

import { describe, expect, it } from 'vitest';
import { LockChangeKind } from '../../../lock/plan-lock.ts';
import { describeLockChange } from '../describe-lock-change.ts';

const FROM = 'a'.repeat(40);

const TO = 'b'.repeat(40);

describe('describeLockChange', () => {
  it('links a moved git source to its changes', () => {
    const change = {
      kind: LockChangeKind.Moved,
      source: 'github:org/presets#v1',
      from: FROM,
      to: TO,
    };

    const note = describeLockChange(change);

    expect(note).toBe(
      `Moved github:org/presets#v1 from aaaaaaa to bbbbbbb.\n  https://github.com/org/presets/compare/${FROM}...${TO}`,
    );
  });

  it('shows a moved source that is not in git without a link', () => {
    const change = {
      kind: LockChangeKind.Moved,
      source: 'npm:presets@^1',
      from: FROM,
      to: TO,
    };

    const note = describeLockChange(change);

    expect(note).toBe('Moved npm:presets@^1 from aaaaaaa to bbbbbbb.');
  });
});

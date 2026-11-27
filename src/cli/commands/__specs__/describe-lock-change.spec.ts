import { describe, expect, it } from 'vitest';
import { LockChangeKind } from '../../../lock/plan-lock.ts';
import { describeLockChange, describeLockSummary } from '../describe-lock-change.ts';

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

describe('describeLockSummary', () => {
  it('builds a table of the added, moved and removed sources', () => {
    const changes = [
      {
        kind: LockChangeKind.Added,
        source: 'github:org/new#v1',
        to: TO,
      },
      {
        kind: LockChangeKind.Moved,
        source: 'gitlab:org/presets#main',
        from: FROM,
        to: TO,
      },
      {
        kind: LockChangeKind.Moved,
        source: 'npm:presets@^1',
        from: FROM,
        to: TO,
      },
      {
        kind: LockChangeKind.Current,
        source: 'github:org/same#v1',
        to: TO,
      },
      {
        kind: LockChangeKind.Removed,
        source: 'github:org/old#v1',
        from: FROM,
      },
    ];

    const summary = describeLockSummary(changes);

    expect(summary).toBe(
      [
        '| Source | Change |',
        '|---|---|',
        '| `github:org/new#v1` | Added at bbbbbbb |',
        `| \`gitlab:org/presets#main\` | [aaaaaaa → bbbbbbb](https://gitlab.com/org/presets/-/compare/${FROM}...${TO}) |`,
        '| `npm:presets@^1` | aaaaaaa → bbbbbbb |',
        '| `github:org/old#v1` | Removed |',
      ].join('\n'),
    );
  });

  it('says that there are no changes when every source is current', () => {
    const changes = [
      {
        kind: LockChangeKind.Current,
        source: 'github:org/same#v1',
        to: TO,
      },
    ];

    const summary = describeLockSummary(changes);

    expect(summary).toBe('No source changes.');
  });
});

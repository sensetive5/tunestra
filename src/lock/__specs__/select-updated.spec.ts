import { describe, expect, it } from 'vitest';
import { selectUpdated } from '../select-updated.ts';

describe('selectUpdated', () => {
  it('rejects a name that is not a git source', () => {
    const act = () => selectUpdated({}, ['../presets/team']);

    expect(act).toThrow('../presets/team is not in tunestra.lock.yaml. Locked sources: none');
  });
});

import { describe, expect, it } from 'vitest';
import type { SettingsEntries } from '../../shared/types/output.ts';
import { mergeSettings } from '../merge-settings.ts';

function createEntries(
  env: Record<string, string>,
  allow: ReadonlyArray<string> = [],
): SettingsEntries {
  return {
    env,
    permissions: {
      allow,
      ask: [],
      deny: [],
    },
  };
}

describe('mergeSettings', () => {
  it('adds the entries and keeps the other settings', () => {
    const current = {
      model: 'opus',
      permissions: {
        allow: ['Bash(ls *)'],
      },
    };
    const next = createEntries({ HTTPS_PROXY: 'http://proxy' }, ['Bash(make *)', 'Bash(ls *)']);

    const merged = mergeSettings(current, undefined, next);

    expect(merged).toEqual({
      model: 'opus',
      permissions: {
        allow: ['Bash(ls *)', 'Bash(make *)'],
      },
      env: {
        HTTPS_PROXY: 'http://proxy',
      },
    });
  });

  it('takes out the entries of the last setup, but keeps a variable that someone changed', () => {
    const current = {
      env: {
        MCP_TIMEOUT: '1000',
        HTTPS_PROXY: 'http://other',
      },
      permissions: {
        allow: ['Bash(make *)', 'Bash(ls *)'],
      },
    };
    const previous = createEntries({ MCP_TIMEOUT: '1000', HTTPS_PROXY: 'http://proxy' }, [
      'Bash(make *)',
    ]);

    const merged = mergeSettings(current, previous, undefined);

    expect(merged).toEqual({
      env: {
        HTTPS_PROXY: 'http://other',
      },
      permissions: {
        allow: ['Bash(ls *)'],
      },
    });
  });

  it('leaves out the lists and objects that become empty', () => {
    const current = {
      env: {
        MCP_TIMEOUT: '1000',
      },
      permissions: {
        allow: ['Bash(make *)'],
      },
    };
    const previous = createEntries({ MCP_TIMEOUT: '1000' }, ['Bash(make *)']);

    const merged = mergeSettings(current, previous, undefined);

    expect(merged).toEqual({});
  });
});

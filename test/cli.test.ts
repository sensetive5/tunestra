import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };

describe('cli', () => {
  it('prints the version from package.json', () => {
    const output = execFileSync(process.execPath, ['src/cli/index.ts', '--version'], {
      encoding: 'utf8',
    });

    expect(output.trim()).toBe(pkg.version);
  });
});

import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };

describe('cli', () => {
  it('prints the version from package.json', () => {
    const args = ['src/cli/index.ts', '--version'];

    const output = execFileSync(process.execPath, args, { encoding: 'utf8' });

    const version = output.trim();
    expect(version).toBe(pkg.version);
  });
});

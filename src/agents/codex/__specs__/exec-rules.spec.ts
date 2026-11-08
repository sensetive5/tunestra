import { describe, expect, it } from 'vitest';
import { convertBashRule } from '../exec-rules.ts';

describe('convertBashRule', () => {
  it('turns a command with any arguments into a prefix', () => {
    const rules = ['Bash(npm test *)', 'Bash(git push:*)'];

    const patterns = rules.map(convertBashRule);

    expect(patterns).toEqual([
      ['npm', 'test'],
      ['git', 'push'],
    ]);
  });

  it('turns a command without a wildcard into a prefix too', () => {
    const pattern = convertBashRule('Bash(rm -rf /)');

    expect(pattern).toEqual(['rm', '-rf', '/']);
  });

  it('skips rules that a prefix cannot express', () => {
    const rules = [
      'Bash',
      'Read(./.env)',
      'Bash(git * --force)',
      'Bash(npm test && rm -rf)',
      'Bash(echo $HOME)',
      'Bash( )',
    ];

    const patterns = rules.map(convertBashRule);

    expect(patterns).toEqual([undefined, undefined, undefined, undefined, undefined, undefined]);
  });
});

import { describe, expect, it } from 'vitest';
import { convertRule } from '../cli-permissions.ts';

describe('convertRule', () => {
  it.each([
    ['Bash', 'Shell(*)'],
    ['Bash(git push *)', 'Shell(git:push *)'],
    ['Bash(git push:*)', 'Shell(git:push *)'],
    ['Bash(npm run lint)', 'Shell(npm:run lint)'],
    ['Bash(ls *)', 'Shell(ls:*)'],
    ['Bash(git)', 'Shell(git:)'],
    ['Read', 'Read(**)'],
    ['Read(./.env)', 'Read(.env)'],
    ['Read(/src/**)', 'Read(src/**)'],
    ['Read(src/**/*.ts)', 'Read(src/**/*.ts)'],
    ['Edit(//etc/**)', 'Write(/etc/**)'],
    ['Write(package.json)', 'Write(package.json)'],
    ['Edit', 'Write(**)'],
    ['WebFetch', 'WebFetch(*)'],
    ['WebFetch(domain:docs.github.com)', 'WebFetch(docs.github.com)'],
    ['mcp__docs__search', 'Mcp(docs:search)'],
    ['mcp__docs', 'Mcp(docs:*)'],
    ['mcp__docs__*', 'Mcp(docs:*)'],
  ])('converts %s to %s', (rule, expected) => {
    const converted = convertRule(rule);

    expect(converted).toBe(expected);
  });

  it.each([
    'Bash(npm test && rm -rf)',
    'Bash(echo $HOME)',
    'Bash(git* push)',
    'Bash( *)',
    'Read(~/.ssh/**)',
    'WebFetch(https://example.com)',
    'Glob',
    'Task(reviewer)',
  ])('skips %s', (rule) => {
    const converted = convertRule(rule);

    expect(converted).toBeUndefined();
  });
});

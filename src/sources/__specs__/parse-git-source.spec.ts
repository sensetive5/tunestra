import { describe, expect, it } from 'vitest';
import { describeGitSource, parseGitSource } from '../parse-git-source.ts';

describe('parseGitSource', () => {
  it('reads the provider, the repository, the path and the ref', () => {
    const ref = 'github:org/presets/team#v1';

    const source = parseGitSource(ref);

    expect(source).toEqual({
      provider: 'github',
      owner: 'org',
      repo: 'presets',
      path: 'team',
      ref: 'v1',
    });
  });

  it.each([
    ['a repository root', 'gitlab:org/presets#main', ''],
    ['a nested path', 'github:org/presets/frontend/react', 'frontend/react'],
  ])('reads %s', (_, ref, expectedPath) => {
    const source = parseGitSource(ref);

    expect(source?.path).toBe(expectedPath);
  });

  it.each([
    ['a relative path', '../presets/team'],
    ['a source without an owner', 'github:presets'],
    ['an unknown provider', 'bitbucket:org/presets'],
  ])('ignores %s', (_, ref) => {
    const source = parseGitSource(ref);

    expect(source).toBeUndefined();
  });
});

describe('describeGitSource', () => {
  it('builds the same reference back', () => {
    const ref = 'github:org/presets/team#v1';
    const source = parseGitSource(ref);

    const description = source === undefined ? '' : describeGitSource(source);

    expect(description).toBe(ref);
  });
});

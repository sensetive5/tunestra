import { describe, expect, it } from 'vitest';
import { buildCompareUrl } from '../build-compare-url.ts';
import { parseGitSource } from '../parse-git-source.ts';

const FROM = 'a'.repeat(40);

const TO = 'b'.repeat(40);

describe('buildCompareUrl', () => {
  it.each([
    [
      'GitHub',
      'github:org/presets/team#v1',
      `https://github.com/org/presets/compare/${FROM}...${TO}`,
    ],
    [
      'GitLab',
      'gitlab:org/presets#main',
      `https://gitlab.com/org/presets/-/compare/${FROM}...${TO}`,
    ],
  ])('links to the compare page of %s', (_, ref, expectedUrl) => {
    const source = parseGitSource(ref);

    const url = source === undefined ? undefined : buildCompareUrl(source, FROM, TO);

    expect(url).toBe(expectedUrl);
  });
});

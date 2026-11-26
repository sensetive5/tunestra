import type { GitSource } from '../shared/types/source.ts';

/** The page of the provider with every change between two commits of the repository. */
export function buildCompareUrl(source: GitSource, from: string, to: string): string {
  const range = `${from}...${to}`;

  if (source.provider === 'gitlab') {
    return `https://gitlab.com/${source.owner}/${source.repo}/-/compare/${range}`;
  }

  return `https://github.com/${source.owner}/${source.repo}/compare/${range}`;
}

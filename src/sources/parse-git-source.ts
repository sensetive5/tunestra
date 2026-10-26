import type { GitSource } from '../shared/types/source.ts';

/**
 * A reference to a preset in a git repository.
 * Groups: 1 provider, 2 owner, 3 repository, 4 path inside it, 5 ref.
 *
 * Matches:        "github:org/presets/team#v1" → github, org, presets, team, v1
 * Matches:        "gitlab:org/presets#main"    → gitlab, org, presets, undefined, main
 * Matches:        "github:org/presets/a/b"     → github, org, presets, a/b, undefined
 * Does not match: "../presets/team" (a local path), "github:presets" (no owner)
 */
const GIT_SOURCE_PATTERN = /^(github|gitlab):([^/#]+)\/([^/#]+)(?:\/([^#]+))?(?:#(.+))?$/;

/** `undefined` for a reference that is not a git source, like a relative path. */
export function parseGitSource(ref: string): GitSource | undefined {
  const match = GIT_SOURCE_PATTERN.exec(ref);

  if (match === null) {
    return undefined;
  }

  const [, provider, owner, repo, path, gitRef] = match;
  const isKnownProvider = provider === 'github' || provider === 'gitlab';

  if (isKnownProvider && typeof owner === 'string' && typeof repo === 'string') {
    return {
      provider,
      owner,
      repo,
      path: path ?? '',
      ref: gitRef,
    };
  }

  return undefined;
}

/** The repository with its ref, without the path: `github:org/presets#v1`. */
export function describeRepository(source: GitSource): string {
  const repository = `${source.provider}:${source.owner}/${source.repo}`;

  if (source.ref === undefined) {
    return repository;
  }

  return `${repository}#${source.ref}`;
}

/** The full reference back: `github:org/presets/team#v1`. */
export function describeGitSource(source: GitSource): string {
  const repository = `${source.provider}:${source.owner}/${source.repo}`;
  const path = source.path === '' ? '' : `/${source.path}`;
  const ref = source.ref === undefined ? '' : `#${source.ref}`;

  return `${repository}${path}${ref}`;
}

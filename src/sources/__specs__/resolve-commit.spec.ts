import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GitSource } from '../../shared/types/source.ts';
import { resolveCommit } from '../resolve-commit.ts';

const COMMIT = 'c9f077f0be2838d45cf7592f1f57615810b3973c';

const SOURCE: GitSource = {
  provider: 'github',
  owner: 'org',
  repo: 'presets',
  path: 'team',
  ref: 'v1',
};

function stubFetch(response: Response): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () => response);

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

describe('resolveCommit', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('asks GitHub for the commit of a tag, with the token', async () => {
    vi.stubEnv('TUNESTRA_GIT_TOKEN', 'secret');
    const fetchMock = stubFetch(new Response(`${COMMIT}\n`));

    const commit = await resolveCommit(SOURCE);

    expect(commit).toBe(COMMIT);
    expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/org/presets/commits/v1', {
      headers: {
        Authorization: 'Bearer secret',
        Accept: 'application/vnd.github.sha',
      },
    });
  });

  it('asks GitLab for the commit of the default branch', async () => {
    vi.stubEnv('TUNESTRA_GIT_TOKEN', undefined);
    const fetchMock = stubFetch(Response.json({ id: COMMIT }));
    const source: GitSource = {
      ...SOURCE,
      provider: 'gitlab',
      ref: undefined,
    };

    const commit = await resolveCommit(source);

    expect(commit).toBe(COMMIT);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gitlab.com/api/v4/projects/org%2Fpresets/repository/commits/HEAD',
      { headers: {} },
    );
  });

  it('keeps a ref that is a commit and does not ask', async () => {
    const fetchMock = stubFetch(new Response(''));
    const source: GitSource = {
      ...SOURCE,
      ref: COMMIT,
    };

    const commit = await resolveCommit(source);

    expect(commit).toBe(COMMIT);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('names the source when the ref is not found', async () => {
    stubFetch(new Response('', { status: 404 }));

    const result = resolveCommit(SOURCE);

    await expect(result).rejects.toThrow(
      'Could not find the commit of github:org/presets#v1: HTTP 404',
    );
  });

  it('names the source when the network fails', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('offline');
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = resolveCommit(SOURCE);

    await expect(result).rejects.toThrow(
      'Could not find the commit of github:org/presets#v1: offline',
    );
  });

  it('rejects an answer that is not a commit', async () => {
    stubFetch(Response.json({ message: 'odd' }));
    const source: GitSource = {
      ...SOURCE,
      provider: 'gitlab',
    };

    const result = resolveCommit(source);

    await expect(result).rejects.toThrow('unexpected answer');
  });
});

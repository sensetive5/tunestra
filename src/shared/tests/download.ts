import { cp } from 'node:fs/promises';
import { TunestraError } from '../errors/tunestra-error.ts';
import type { DownloadRepository, GitSource, ResolveCommit } from '../types/source.ts';
import { hashContent } from '../utils/hash.ts';

const COMMIT_LENGTH = 40;

export type FakeDownload = {
  download: DownloadRepository;
  resolveCommit: ResolveCommit;
  /** Repositories in the order they were downloaded, by their ref: `github:org/presets#v1`. */
  downloaded: ReadonlyArray<string>;
  /** Moves the ref to a new commit with other files, like a moved tag. */
  publish: (repository: string, dir: string) => void;
  /** The commit that a ref points to now. */
  findCommit: (repository: string) => string;
};

type FakeRepository = {
  dir: string;
  commit: string;
};

/**
 * Copies local directories instead of downloading: repository with ref → directory. Every
 * ref points to a made-up commit, and the repository can be downloaded at that commit too.
 */
export function createFakeDownload(repositories: Readonly<Record<string, string>>): FakeDownload {
  const downloaded: Array<string> = [];
  const current = new Map<string, FakeRepository>();
  const byCommit = new Map<string, string>();
  let version = 0;

  const publish = (repository: string, dir: string): void => {
    version += 1;

    const commit = hashContent(`${repository}@${version}`).slice(0, COMMIT_LENGTH);

    current.set(repository, {
      dir,
      commit,
    });
    byCommit.set(commit, dir);
  };

  const entries = Object.entries(repositories);

  for (const [repository, dir] of entries) {
    publish(repository, dir);
  }

  const findRepository = (source: GitSource): FakeRepository | undefined => {
    const key = describeFakeRepository(source);

    return current.get(key);
  };

  const download = async (source: GitSource, dir: string): Promise<void> => {
    const key = describeFakeRepository(source);
    const commitDir = typeof source.ref === 'string' ? byCommit.get(source.ref) : undefined;
    const repositoryDir = commitDir ?? findRepository(source)?.dir;

    downloaded.push(key);

    if (repositoryDir === undefined) {
      throw new TunestraError(`Could not download ${key}`);
    }

    await cp(repositoryDir, dir, { recursive: true });
  };

  const resolveCommit = async (source: GitSource): Promise<string> => {
    const repository = findRepository(source);

    if (repository === undefined) {
      const key = describeFakeRepository(source);

      throw new TunestraError(`Could not find the commit of ${key}`);
    }

    return repository.commit;
  };

  const findCommit = (repository: string): string => current.get(repository)?.commit ?? '';

  return {
    download,
    resolveCommit,
    downloaded,
    publish,
    findCommit,
  };
}

function describeFakeRepository(source: GitSource): string {
  return `${source.provider}:${source.owner}/${source.repo}#${source.ref}`;
}

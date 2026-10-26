import { cp } from 'node:fs/promises';
import { TunestraError } from '../errors/tunestra-error.ts';
import type { DownloadRepository, GitSource } from '../types/source.ts';

export type FakeDownload = {
  download: DownloadRepository;
  /** Repositories in the order they were downloaded: `github:org/presets#v1`. */
  downloaded: ReadonlyArray<string>;
};

/** Copies local directories instead of downloading: repository with ref → directory. */
export function createFakeDownload(repositories: Readonly<Record<string, string>>): FakeDownload {
  const downloaded: Array<string> = [];

  const download = async (source: GitSource, dir: string): Promise<void> => {
    const key = `${source.provider}:${source.owner}/${source.repo}#${source.ref}`;
    const repositoryDir = repositories[key];

    downloaded.push(key);

    if (repositoryDir === undefined) {
      throw new TunestraError(`Could not download ${key}`);
    }

    await cp(repositoryDir, dir, { recursive: true });
  };

  return {
    download,
    downloaded,
  };
}

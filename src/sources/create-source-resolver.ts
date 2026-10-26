import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { SOURCES_DIR } from '../shared/constants/output.ts';
import { TunestraError } from '../shared/errors/tunestra-error.ts';
import type { DownloadRepository, GitSource } from '../shared/types/source.ts';
import { toPosixPath } from '../shared/utils/paths.ts';
import { downloadRepository } from './download-repository.ts';
import { describeGitSource, describeRepository, parseGitSource } from './parse-git-source.ts';

/** Turns references from `extends` into directories, downloading git sources when needed. */
export type SourceResolver = {
  resolve: (ref: string, fromDir: string) => Promise<string>;
  /** The git reference of a directory inside a downloaded repository. */
  describeRemote: (dir: string) => string | undefined;
};

type Repository = {
  root: string;
  source: GitSource;
};

export function createSourceResolver(
  projectDir: string,
  download: DownloadRepository = downloadRepository,
): SourceResolver {
  const downloads = new Map<string, Promise<Repository>>();
  const repositories: Array<Repository> = [];

  /** Each repository at each ref is downloaded once, however many presets come from it. */
  const fetchRepository = (source: GitSource): Promise<Repository> => {
    const key = describeRepository(source);
    const started = downloads.get(key);

    if (typeof started === 'object') {
      return started;
    }

    const refName = source.ref ?? 'HEAD';
    const refFolder = encodeURIComponent(refName);
    const root = join(
      projectDir,
      SOURCES_DIR,
      source.provider,
      source.owner,
      source.repo,
      refFolder,
    );
    const repository = {
      root,
      source,
    };
    const downloading = download(source, root).then(() => repository);

    repositories.push(repository);
    downloads.set(key, downloading);

    return downloading;
  };

  const findRepository = (dir: string): Repository | undefined => {
    return repositories.find((repository) => isInside(repository.root, dir));
  };

  const resolveRef = async (ref: string, fromDir: string): Promise<string> => {
    const gitSource = parseGitSource(ref);

    if (typeof gitSource === 'object') {
      const repository = await fetchRepository(gitSource);
      const dir = join(repository.root, gitSource.path);

      return checkInside(repository, dir, ref);
    }

    const dir = resolve(fromDir, ref);
    const repository = findRepository(fromDir);

    if (repository === undefined) {
      return dir;
    }

    return checkInside(repository, dir, ref);
  };

  const describeRemote = (dir: string): string | undefined => {
    const repository = findRepository(dir);

    if (repository === undefined) {
      return undefined;
    }

    const path = relative(repository.root, dir);
    const source = {
      ...repository.source,
      path: toPosixPath(path),
    };

    return describeGitSource(source);
  };

  return {
    resolve: resolveRef,
    describeRemote,
  };
}

/** A preset from git can only reach presets of the same repository with a relative path. */
function checkInside(repository: Repository, dir: string, ref: string): string {
  const isSafe = isInside(repository.root, dir);

  if (isSafe) {
    return dir;
  }

  const name = describeRepository(repository.source);

  throw new TunestraError(
    `"${ref}" points outside of ${name}. A preset from git can only extend presets of the same repository or other git sources`,
  );
}

function isInside(root: string, dir: string): boolean {
  const path = relative(root, dir);
  const isParent = path === '..' || path.startsWith(`..${sep}`);
  const isOtherDrive = isAbsolute(path);

  return isParent === false && isOtherDrive === false;
}

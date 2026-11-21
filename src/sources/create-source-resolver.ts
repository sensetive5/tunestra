import { homedir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { LOCK_FILE } from '../shared/constants/files.ts';
import { SOURCES_DIR } from '../shared/constants/output.ts';
import { TunestraError } from '../shared/errors/tunestra-error.ts';
import type {
  DownloadRepository,
  GitSource,
  LockedSource,
  LockedSources,
  ResolveCommit,
} from '../shared/types/source.ts';
import { toPosixPath } from '../shared/utils/paths.ts';
import { downloadRepository } from './download-repository.ts';
import { hashDirectory } from './hash-directory.ts';
import { describeGitSource, describeRepository, parseGitSource } from './parse-git-source.ts';
import { resolveCommit } from './resolve-commit.ts';

const HOME_PREFIX = '~/';

/** Turns references from `extends` into directories, downloading git sources when needed. */
export type SourceResolver = {
  resolve: (ref: string, fromDir: string) => Promise<string>;
  /** The git reference of a directory inside a downloaded repository. */
  describeRemote: (dir: string) => string | undefined;
  /** The commits of the downloaded sources, for `tunestra.lock.yaml`. */
  listLocked: () => LockedSources;
};

export type SourceResolverOptions = {
  /** Replaces the download of git sources, for tests. */
  download?: DownloadRepository | undefined;
  /** Replaces the API of the providers, for tests. */
  resolveCommit?: ResolveCommit | undefined;
  /** Sources from `tunestra.lock.yaml`: they are downloaded at their commit and checked. */
  locked?: LockedSources;
  /**
   * Find the commit of a source that is not locked yet. Without it, such a source is
   * downloaded at its ref and is not locked: for the personal level.
   */
  locksNewSources?: boolean;
};

type Repository = {
  root: string;
  source: GitSource;
};

export function createSourceResolver(
  projectDir: string,
  options: SourceResolverOptions = {},
): SourceResolver {
  const {
    download = downloadRepository,
    resolveCommit: findCommit = resolveCommit,
    locked = {},
    locksNewSources = false,
  } = options;
  const downloads = new Map<string, Promise<Repository>>();
  const repositories: Array<Repository> = [];
  const lockedNow = new Map<string, LockedSource>();

  /** The commit to download: from the lock file, from the provider, or none. */
  const findDownloadCommit = async (
    key: string,
    source: GitSource,
  ): Promise<string | undefined> => {
    const lockedSource = locked[key];

    if (typeof lockedSource === 'object') {
      return lockedSource.commit;
    }

    if (locksNewSources) {
      return findCommit(source);
    }

    return undefined;
  };

  const downloadLocked = async (key: string, source: GitSource, root: string): Promise<void> => {
    const commit = await findDownloadCommit(key, source);

    if (commit === undefined) {
      await download(source, root);

      return;
    }

    const commitSource = {
      ...source,
      ref: commit,
    };

    await download(commitSource, root);

    const integrity = await hashDirectory(root);
    const lockedSource = locked[key];
    const hasSameFiles = lockedSource === undefined || lockedSource.integrity === integrity;

    if (hasSameFiles === false) {
      throw new TunestraError(
        `The files of ${key} at commit ${commit} differ from ${LOCK_FILE}. Check that nobody changed the repository, then run tunestra update ${key}`,
      );
    }

    lockedNow.set(key, {
      commit,
      integrity,
    });
  };

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
    const downloading = downloadLocked(key, source, root).then(() => repository);

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

    const dir = resolveLocalPath(ref, fromDir);
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

  const listLocked = (): LockedSources => Object.fromEntries(lockedNow);

  return {
    resolve: resolveRef,
    describeRemote,
    listLocked,
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

/**
 * A path from `extends`. `~/` starts at the home directory, so that a personal preset can
 * live there; any other path starts at the directory that refers to it.
 */
function resolveLocalPath(ref: string, fromDir: string): string {
  const isInHome = ref.startsWith(HOME_PREFIX);

  if (isInHome) {
    const path = ref.slice(HOME_PREFIX.length);

    return resolve(homedir(), path);
  }

  return resolve(fromDir, ref);
}

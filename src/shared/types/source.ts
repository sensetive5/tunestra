/** A preset in a git repository: `<provider>:<owner>/<repo>/<path>#<ref>`. */
export type GitSource = {
  provider: 'github' | 'gitlab';
  owner: string;
  repo: string;
  /** Path of the preset inside the repository; empty for the repository root. */
  path: string;
  /** Tag, branch or commit; `undefined` means the default branch. */
  ref: string | undefined;
};

/** Downloads the whole repository of a source into a directory. */
export type DownloadRepository = (source: GitSource, dir: string) => Promise<void>;

/** Finds the commit that the ref of a source points to now. */
export type ResolveCommit = (source: GitSource) => Promise<string>;

/** A git source in `tunestra.lock.yaml`: the commit and a hash of its files. */
export type LockedSource = {
  commit: string;
  /** `sha256-<base64>` of every file path and content in the repository. */
  integrity: string;
};

/** Locked sources by repository with its ref: `github:org/presets#v1`. */
export type LockedSources = Readonly<Record<string, LockedSource>>;

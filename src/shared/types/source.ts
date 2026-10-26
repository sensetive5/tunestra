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

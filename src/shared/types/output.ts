import type { OutputKind } from '../constants/output.ts';

/** Paths are relative to the project directory. */
export type OutputFile = {
  kind: typeof OutputKind.File;
  path: string;
  content: string;
};

export type OutputCopy = {
  kind: typeof OutputKind.Copy;
  path: string;
  /** Absolute path of the source file. */
  from: string;
};

export type OutputSymlink = {
  kind: typeof OutputKind.Symlink;
  path: string;
  /** Relative to the directory of the link. */
  target: string;
};

export type Output = OutputFile | OutputCopy | OutputSymlink;

/** Everything `tunestra setup` writes, before it touches the disk. */
export type SetupPlan = {
  outputs: ReadonlyArray<Output>;
  /** Paths for the tunestra block in `.gitignore`, relative to the project. */
  ignoredPaths: ReadonlyArray<string>;
  /** Files that people may have written by hand; setup must not overwrite those. */
  protectedPaths: ReadonlyArray<string>;
};

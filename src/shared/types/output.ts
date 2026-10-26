import type { OutputKind } from '../constants/output.ts';

/**
 * `path` is relative to the project directory. `source` tells people what to edit instead
 * of the generated file, for example `../presets/team/rules/code-style.md`.
 */
type OutputBase<TKind extends OutputKind> = {
  kind: TKind;
  path: string;
  source: string;
};

export type OutputFile = OutputBase<typeof OutputKind.File> & {
  content: string;
};

export type OutputCopy = OutputBase<typeof OutputKind.Copy> & {
  /** Absolute path of the source file. */
  from: string;
};

export type OutputSymlink = OutputBase<typeof OutputKind.Symlink> & {
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

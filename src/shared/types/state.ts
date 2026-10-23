/** A generated file is recorded by the hash of its content. */
export type FileRecord = {
  hash: string;
};

/** A generated symlink is recorded by its target. */
export type SymlinkRecord = {
  target: string;
};

export type OutputRecord = FileRecord | SymlinkRecord;

/** What the last setup generated, by path relative to the project. */
export type SetupState = {
  version: number;
  outputs: Readonly<Record<string, OutputRecord>>;
};

/** An error caused by the user's input: a broken manifest, a missing file and so on. */
export class TunestraError extends Error {
  override name = 'TunestraError';

  /** Every problem behind this error; one item for a simple error. */
  readonly problems: ReadonlyArray<string>;

  constructor(message: string, problems: ReadonlyArray<string> = [message]) {
    super(message);
    this.problems = problems;
  }
}

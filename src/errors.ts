/** An error caused by the user's input: a broken manifest, a missing file and so on. */
export class TunestraError extends Error {
  override name = 'TunestraError';
}

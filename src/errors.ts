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

/** Builds one error from several problems, so that the user can fix them all at once. */
export function createProblemsError(problems: ReadonlyArray<string>): TunestraError {
  const [firstProblem] = problems;
  const hasOneProblem = problems.length === 1;

  if (hasOneProblem && typeof firstProblem === 'string') {
    return new TunestraError(firstProblem);
  }

  const items = problems.map(formatProblem);
  const list = items.join('\n\n');
  const message = `Found ${problems.length} problems:\n\n${list}`;

  return new TunestraError(message, problems);
}

/** Numbers a problem and indents its next lines under the number. */
function formatProblem(problem: string, index: number): string {
  const number = `${index + 1}. `;
  const indent = ' '.repeat(number.length);
  const text = problem.trimEnd();
  const [firstLine, ...nextLines] = text.split('\n');
  const indentedLines = nextLines.map((line) => indentLine(line, indent));

  return [`${number}${firstLine}`, ...indentedLines].join('\n');
}

/** Leaves empty lines empty, so that the message has no trailing spaces. */
function indentLine(line: string, indent: string): string {
  const text = line.trimEnd();

  if (text === '') {
    return text;
  }

  return `${indent}${text}`;
}

import { describe, expect, it } from 'vitest';
import { createProblemsError } from '../create-problems-error.ts';

describe('createProblemsError', () => {
  it('keeps a single problem as is', () => {
    const problems = ['Invalid frontmatter in a.md'];

    const error = createProblemsError(problems);

    expect(error.message).toBe('Invalid frontmatter in a.md');
    expect(error.problems).toEqual(problems);
  });

  it('numbers several problems and indents their next lines', () => {
    const problems = ['First problem:\n✖ detail\n', 'Second problem'];

    const error = createProblemsError(problems);

    expect(error.message).toBe(
      'Found 2 problems:\n\n1. First problem:\n   ✖ detail\n\n2. Second problem',
    );
    expect(error.problems).toEqual(problems);
  });

  it('leaves no trailing spaces on empty lines', () => {
    const problems = ['A:\n  \ncode', 'B'];

    const error = createProblemsError(problems);

    expect(error.message).toBe('Found 2 problems:\n\n1. A:\n\n   code\n\n2. B');
  });
});

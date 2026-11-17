import { describe, expect, it } from 'vitest';
import type { Subagent } from '../../../shared/types/preset.ts';
import { renderCursorSubagent } from '../subagent-md.ts';

const SUBAGENT: Subagent = {
  key: 'reviewer',
  source: 'agents/reviewer.md',
  description: 'Reviews diffs',
  model: {},
  effort: undefined,
  readOnly: false,
  body: 'Review the diff.\n',
};

describe('renderCursorSubagent', () => {
  it('writes only the name and the description when nothing else is set', () => {
    const content = renderCursorSubagent(SUBAGENT);

    expect(content).toBe(
      '---\nname: reviewer\ndescription: Reviews diffs\n---\nReview the diff.\n',
    );
  });

  it('takes the model of Cursor and makes the subagent read-only', () => {
    const subagent: Subagent = {
      ...SUBAGENT,
      model: {
        claude: 'sonnet',
        cursor: 'composer-2',
      },
      readOnly: true,
    };

    const content = renderCursorSubagent(subagent);

    expect(content).toBe(
      [
        '---',
        'name: reviewer',
        'description: Reviews diffs',
        'model: composer-2',
        'readonly: true',
        '---',
        'Review the diff.',
        '',
      ].join('\n'),
    );
  });
});

import { describe, expect, it } from 'vitest';
import type { Subagent } from '../../../shared/types/preset.ts';
import { renderSubagentMd } from '../subagent-md.ts';

const SUBAGENT: Subagent = {
  key: 'reviewer',
  source: 'agents/reviewer.md',
  description: 'Reviews diffs',
  model: {},
  effort: undefined,
  readOnly: false,
  body: 'Review the diff.\n',
};

describe('renderSubagentMd', () => {
  it('writes only the name and the description when nothing else is set', () => {
    const content = renderSubagentMd(SUBAGENT);

    expect(content).toBe(
      '---\nname: reviewer\ndescription: Reviews diffs\n---\nReview the diff.\n',
    );
  });

  it('takes the model of Claude Code and takes away the tools that change files', () => {
    const subagent: Subagent = {
      ...SUBAGENT,
      model: {
        claude: 'sonnet',
        codex: 'gpt-5.5',
      },
      effort: 'high',
      readOnly: true,
    };

    const content = renderSubagentMd(subagent);

    expect(content).toBe(
      [
        '---',
        'name: reviewer',
        'description: Reviews diffs',
        'model: sonnet',
        'effort: high',
        'disallowedTools:',
        '  - Write',
        '  - Edit',
        '  - NotebookEdit',
        '  - Bash',
        '---',
        'Review the diff.',
        '',
      ].join('\n'),
    );
  });
});

import { parse } from 'smol-toml';
import { describe, expect, it } from 'vitest';
import type { Subagent } from '../../../shared/types/preset.ts';
import { renderSubagentToml } from '../subagent-toml.ts';

const SUBAGENT: Subagent = {
  key: 'reviewer',
  source: 'agents/reviewer.md',
  description: 'Reviews diffs',
  model: {},
  effort: undefined,
  readOnly: false,
  body: 'Review the diff.\n',
};

describe('renderSubagentToml', () => {
  it('writes the name, the description and the instructions', () => {
    const content = renderSubagentToml(SUBAGENT);

    const config = parse(content);
    expect(config).toEqual({
      name: 'reviewer',
      description: 'Reviews diffs',
      developer_instructions: 'Review the diff.\n',
    });
  });

  it('takes the model of Codex and the effort', () => {
    const subagent: Subagent = {
      ...SUBAGENT,
      model: {
        claude: 'sonnet',
        codex: 'gpt-5.5',
      },
      effort: 'xhigh',
    };

    const content = renderSubagentToml(subagent);

    const config = parse(content);
    expect(config).toMatchObject({
      model: 'gpt-5.5',
      model_reasoning_effort: 'xhigh',
    });
  });

  it('turns off the shell of a read-only subagent and asks it not to edit files', () => {
    const subagent: Subagent = {
      ...SUBAGENT,
      readOnly: true,
    };

    const content = renderSubagentToml(subagent);

    const config = parse(content);
    expect(config).toMatchObject({
      developer_instructions: 'Do not create, edit or delete files.\n\nReview the diff.\n',
      features: {
        shell_tool: false,
      },
    });
  });
});

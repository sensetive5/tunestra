import { describe, expect, it } from 'vitest';
import { createTree } from '../../../shared/tests/temp.ts';
import { buildInstructionsKey, loadRules } from '../rules.ts';

describe('buildInstructionsKey', () => {
  it('joins the word instructions and the preset name', () => {
    const presetName = 'team';

    const key = buildInstructionsKey(presetName);

    expect(key).toBe('instructions@team');
  });
});

describe('loadRules', () => {
  it('puts level instructions first, then rules by file name', async () => {
    const dir = await createTree({
      'AGENTS.md': '# Team\n',
      'rules/b.md': '# B\n',
      'rules/a.md': '# A\n',
    });

    const rules = await loadRules(dir, 'team');

    const keys = rules.map((rule) => rule.key);
    expect(keys).toEqual(['instructions@team', 'a', 'b']);
  });

  it('works without level instructions', async () => {
    const dir = await createTree({
      'rules/a.md': '# A\n',
    });

    const rules = await loadRules(dir, 'team');

    const keys = rules.map((rule) => rule.key);
    expect(keys).toEqual(['a']);
  });

  it('keeps the description and drops the frontmatter from the text', async () => {
    const dir = await createTree({
      'rules/style.md': '---\ndescription: Code style\npaths: ["**/*.ts"]\n---\n# Style\n',
    });

    const [rule] = await loadRules(dir, 'team');

    expect(rule).toEqual({
      key: 'style',
      source: 'rules/style.md',
      description: 'Code style',
      body: '# Style\n',
    });
  });

  it('ignores files that are not markdown', async () => {
    const dir = await createTree({
      'rules/a.md': '# A\n',
      'rules/notes.txt': 'Not a rule',
    });

    const rules = await loadRules(dir, 'team');

    const keys = rules.map((rule) => rule.key);
    expect(keys).toEqual(['a']);
  });
});

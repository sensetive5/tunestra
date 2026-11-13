import { describe, expect, it } from 'vitest';
import { createTree } from '../../../shared/tests/temp.ts';
import { loadSubagents } from '../subagents.ts';

describe('loadSubagents', () => {
  it('reads the model for each agent, the effort and the instructions', async () => {
    const dir = await createTree({
      'agents/reviewer.md':
        '---\ndescription: Reviews diffs\nmodel:\n  claude: sonnet\n  codex: gpt-5.5\neffort: medium\nreadOnly: true\n---\nReview the diff.\n',
    });

    const [subagent] = await loadSubagents(dir);

    expect(subagent).toEqual({
      key: 'reviewer',
      source: 'agents/reviewer.md',
      description: 'Reviews diffs',
      model: {
        claude: 'sonnet',
        codex: 'gpt-5.5',
      },
      effort: 'medium',
      readOnly: true,
      body: 'Review the diff.\n',
    });
  });

  it('uses the model of the main session and allows edits by default', async () => {
    const dir = await createTree({
      'agents/reviewer.md': '---\ndescription: Reviews diffs\n---\nReview the diff.\n',
    });

    const [subagent] = await loadSubagents(dir);

    expect(subagent?.model).toEqual({});
    expect(subagent?.effort).toBeUndefined();
    expect(subagent?.readOnly).toBe(false);
  });

  it('rejects a subagent without a description', async () => {
    const dir = await createTree({
      'agents/reviewer.md': 'Review the diff.\n',
    });

    const result = loadSubagents(dir);

    await expect(result).rejects.toThrow('description');
  });

  it('rejects a field that tunestra does not know', async () => {
    const dir = await createTree({
      'agents/reviewer.md': '---\ndescription: Reviews diffs\ncolor: red\n---\nReview.\n',
    });

    const result = loadSubagents(dir);

    await expect(result).rejects.toThrow('color');
  });

  it('rejects a model for an unknown agent', async () => {
    const dir = await createTree({
      'agents/reviewer.md':
        '---\ndescription: Reviews diffs\nmodel:\n  cursor: auto\n---\nReview.\n',
    });

    const result = loadSubagents(dir);

    await expect(result).rejects.toThrow('cursor');
  });

  it('rejects an effort that one of the agents does not accept', async () => {
    const dir = await createTree({
      'agents/reviewer.md': '---\ndescription: Reviews diffs\neffort: max\n---\nReview.\n',
    });

    const result = loadSubagents(dir);

    await expect(result).rejects.toThrow('effort');
  });

  it('rejects a file name that cannot be a subagent name', async () => {
    const dir = await createTree({
      'agents/Code_Reviewer.md': '---\ndescription: Reviews diffs\n---\nReview.\n',
    });

    const result = loadSubagents(dir);

    await expect(result).rejects.toThrow('agents/Code_Reviewer.md');
  });

  it('rejects a subagent without instructions', async () => {
    const dir = await createTree({
      'agents/reviewer.md': '---\ndescription: Reviews diffs\n---\n\n',
    });

    const result = loadSubagents(dir);

    await expect(result).rejects.toThrow('has no instructions');
  });
});

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runSetup } from '../../../setup/run-setup.ts';
import { createTree } from '../../../shared/tests/temp.ts';

describe('Claude Code subagents', () => {
  it('writes a subagent to .claude/agents and lists it in AGENTS.md', async () => {
    const root = await createTree({
      'project/tunestra.yaml': 'extends: [../base]\n',
      'base/tunestra.preset.yaml': 'name: base\nlevel: base\n',
      'base/agents/reviewer.md': '---\ndescription: Reviews diffs\n---\nReview the diff.\n',
    });
    const projectDir = join(root, 'project');
    const subagentPath = join(projectDir, '.claude/agents/reviewer.md');
    const indexPath = join(projectDir, 'AGENTS.md');

    const { plan } = await runSetup(projectDir, { dryRun: false });

    const subagent = await readFile(subagentPath, 'utf8');
    const index = await readFile(indexPath, 'utf8');
    expect(subagent).toBe(
      '---\nname: reviewer\ndescription: Reviews diffs\n---\nReview the diff.\n',
    );
    expect(index).toContain('| reviewer | base | Reviews diffs |');
    expect(plan.ignoredPaths).toContain('.claude/agents/');
  });
});

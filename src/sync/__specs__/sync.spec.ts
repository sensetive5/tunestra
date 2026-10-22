import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runSetup } from '../../setup/run-setup.ts';
import { createTree } from '../../shared/tests/temp.ts';
import { checkExists } from '../../shared/utils/fs.ts';

const WRITE = {
  dryRun: false,
};

const SOURCES = {
  'project/tunestra.yaml': 'extends: [../base]\n',
  'base/tunestra.preset.yaml': 'name: base\nlevel: base\n',
  'base/rules/security.md': '# Security\n',
  'base/rules/style.md': '# Style\n',
  'base/skills/review/SKILL.md': '---\nname: review\ndescription: Review code\n---\n',
};

const STYLE_RULE = '.agents/rules/40-base-style.md';
const STYLE_RULE_COPY = '.claude/rules/tunestra/40-base-style.md';

async function setUpProject(): Promise<{ root: string; projectDir: string }> {
  const root = await createTree(SOURCES);
  const projectDir = join(root, 'project');

  await runSetup(projectDir, WRITE);

  return {
    root,
    projectDir,
  };
}

describe('setup over its own output', () => {
  it('removes the files of a deleted rule', async () => {
    const { root, projectDir } = await setUpProject();
    const styleSource = join(root, 'base/rules/style.md');
    const stylePath = join(projectDir, STYLE_RULE);
    const styleCopyPath = join(projectDir, STYLE_RULE_COPY);
    await rm(styleSource);

    const sync = await runSetup(projectDir, WRITE);

    const hasStyle = await checkExists(stylePath);
    const hasStyleCopy = await checkExists(styleCopyPath);
    expect(sync.removals).toEqual([STYLE_RULE, STYLE_RULE_COPY]);
    expect(hasStyle).toBe(false);
    expect(hasStyleCopy).toBe(false);
  });

  it('removes a deleted skill with its now empty directory', async () => {
    const { root, projectDir } = await setUpProject();
    const skillSource = join(root, 'base/skills');
    const skillDir = join(projectDir, '.agents/skills/review');
    const skillLink = join(projectDir, '.claude/skills/review');
    await rm(skillSource, { recursive: true });

    await runSetup(projectDir, WRITE);

    const hasSkillDir = await checkExists(skillDir);
    const hasSkillLink = await checkExists(skillLink);
    expect(hasSkillDir).toBe(false);
    expect(hasSkillLink).toBe(false);
  });

  it('replaces an edited file and tells what to edit instead', async () => {
    const { projectDir } = await setUpProject();
    const stylePath = join(projectDir, STYLE_RULE);
    const generated = await readFile(stylePath, 'utf8');
    await writeFile(stylePath, 'Edited by hand');

    const sync = await runSetup(projectDir, WRITE);

    const restored = await readFile(stylePath, 'utf8');
    expect(restored).toBe(generated);
    expect(sync.warnings).toEqual([
      `${STYLE_RULE} was edited by hand; tunestra replaced it. Edit ../base/rules/style.md instead`,
    ]);
  });

  it('keeps an edited file that is no longer generated', async () => {
    const { root, projectDir } = await setUpProject();
    const styleSource = join(root, 'base/rules/style.md');
    const stylePath = join(projectDir, STYLE_RULE);
    await writeFile(stylePath, 'Edited by hand');
    await rm(styleSource);

    const sync = await runSetup(projectDir, WRITE);

    const kept = await readFile(stylePath, 'utf8');
    expect(kept).toBe('Edited by hand');
    expect(sync.removals).toEqual([STYLE_RULE_COPY]);
    expect(sync.warnings).toEqual([
      `${STYLE_RULE} is no longer generated, but it was edited by hand, so tunestra kept it. Delete it when you no longer need it`,
    ]);
  });

  it('does not overwrite a file that tunestra did not create', async () => {
    const root = await createTree({
      ...SOURCES,
      'base/mcp/tracker.yaml': 'command: npx\n',
      'project/.mcp.json': '{ "mcpServers": {} }\n',
    });
    const projectDir = join(root, 'project');

    const result = runSetup(projectDir, WRITE);

    await expect(result).rejects.toThrow(
      '.mcp.json already exists, and tunestra did not create it',
    );
  });

  it('runs again after the state file is lost', async () => {
    const { projectDir } = await setUpProject();
    const statePath = join(projectDir, '.tunestra/state/outputs.json');
    await rm(statePath);

    const sync = await runSetup(projectDir, WRITE);

    expect(sync.warnings).toEqual([]);
  });

  it('records every output with sorted paths', async () => {
    const { projectDir } = await setUpProject();
    const statePath = join(projectDir, '.tunestra/state/outputs.json');

    const state = await readFile(statePath, 'utf8');

    const parsed: unknown = JSON.parse(state);
    const rulesPosition = state.indexOf('.agents/rules');
    const indexPosition = state.indexOf('AGENTS.md');
    expect(parsed).toMatchObject({
      version: 1,
      outputs: {
        '.claude/skills/review': {
          target: '../../.agents/skills/review',
        },
      },
    });
    expect(rulesPosition).toBeLessThan(indexPosition);
  });
});

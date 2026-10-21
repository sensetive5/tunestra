import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BASIC_INPUT } from '../../__specs__/helpers/fixtures.ts';
import { createTree } from '../../__specs__/helpers/temp.ts';
import { loadProject } from '../load-project.ts';

describe('loadProject', () => {
  it('reads tunestra.yaml and artifacts from .tunestra/', async () => {
    const dir = join(BASIC_INPUT, 'project');
    const artifactsDir = join(dir, '.tunestra');

    const project = await loadProject(dir);

    const ruleKeys = project.rules.map((rule) => rule.key);
    const skillKeys = project.skills.map((skill) => skill.key);
    expect(project).toMatchObject({
      name: 'project',
      level: 'project',
      extends: ['../presets/team'],
      agents: ['claude'],
      dir,
      artifactsDir,
    });
    expect(ruleKeys).toEqual(['instructions@project', 'architecture']);
    expect(skillKeys).toEqual(['domain-model']);
  });

  it('uses defaults for an empty config', async () => {
    const root = await createTree({
      'my-service/tunestra.yaml': '',
    });
    const dir = join(root, 'my-service');

    const project = await loadProject(dir);

    expect(project).toMatchObject({
      name: 'my-service',
      extends: [],
      agents: ['claude'],
      rules: [],
      skills: [],
      commands: [],
      mcp: [],
    });
  });

  it('suggests init when tunestra.yaml is missing', async () => {
    const dir = await createTree({});

    const result = loadProject(dir);

    await expect(result).rejects.toThrow('Run `tunestra init` first');
  });
});

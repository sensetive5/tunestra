import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createFakeDownload } from '../../shared/tests/download.ts';
import { BASIC_INPUT } from '../../shared/tests/fixtures.ts';
import { createTree } from '../../shared/tests/temp.ts';
import { loadChain } from '../load-chain.ts';

describe('loadChain', () => {
  it('orders the basic fixture from general to specific', async () => {
    const projectDir = join(BASIC_INPUT, 'project');

    const chain = await loadChain(projectDir);

    const names = chain.levels.map((level) => level.name);
    expect(names).toEqual(['base', 'team', 'project']);
    expect(chain.project.name).toBe('project');
  });

  it('adds a preset that two levels extend only once, after its children need it', async () => {
    const root = await createTree({
      'project/tunestra.yaml': 'extends: [../frontend, ../backend]\n',
      'frontend/tunestra.preset.yaml': 'name: frontend\nlevel: team\nextends: [../base]\n',
      'backend/tunestra.preset.yaml': 'name: backend\nlevel: team\nextends: [../base]\n',
      'base/tunestra.preset.yaml': 'name: base\nlevel: base\n',
    });
    const projectDir = join(root, 'project');

    const chain = await loadChain(projectDir);

    const names = chain.levels.map((level) => level.name);
    expect(names).toEqual(['base', 'frontend', 'backend', 'project']);
  });

  it('reports a cycle in extends', async () => {
    const root = await createTree({
      'project/tunestra.yaml': 'extends: [../a]\n',
      'a/tunestra.preset.yaml': 'name: a\nlevel: team\nextends: [../b]\n',
      'b/tunestra.preset.yaml': 'name: b\nlevel: team\nextends: [../a]\n',
    });
    const projectDir = join(root, 'project');

    const result = loadChain(projectDir);

    await expect(result).rejects.toThrow('Cycle in extends: a → b → a');
  });

  it('rejects a level that extends a more specific level', async () => {
    const root = await createTree({
      'project/tunestra.yaml': 'extends: [../base]\n',
      'base/tunestra.preset.yaml': 'name: base\nlevel: base\nextends: [../team]\n',
      'team/tunestra.preset.yaml': 'name: team\nlevel: team\n',
    });
    const projectDir = join(root, 'project');

    const result = loadChain(projectDir);

    await expect(result).rejects.toThrow('base (base) extends team (team), a more specific level');
  });

  it('allows a level to extend the same level', async () => {
    const root = await createTree({
      'project/tunestra.yaml': 'extends: [../frontend]\n',
      'frontend/tunestra.preset.yaml': 'name: frontend\nlevel: team\nextends: [../react]\n',
      'react/tunestra.preset.yaml': 'name: react\nlevel: team\n',
    });
    const projectDir = join(root, 'project');

    const chain = await loadChain(projectDir);

    const names = chain.levels.map((level) => level.name);
    expect(names).toEqual(['react', 'frontend', 'project']);
  });

  it('rejects two levels with the same name', async () => {
    const root = await createTree({
      'project/tunestra.yaml': 'extends: [../one, ../two]\n',
      'one/tunestra.preset.yaml': 'name: team\nlevel: team\n',
      'two/tunestra.preset.yaml': 'name: team\nlevel: team\n',
    });
    const projectDir = join(root, 'project');

    const result = loadChain(projectDir);

    await expect(result).rejects.toThrow('Two levels have the same name "team"');
  });

  it('reports a missing preset', async () => {
    const root = await createTree({
      'project/tunestra.yaml': 'extends: [../missing]\n',
    });
    const projectDir = join(root, 'project');

    const result = loadChain(projectDir);

    await expect(result).rejects.toThrow('tunestra.preset.yaml is missing');
  });

  it('loads presets from git and keeps their git references', async () => {
    const root = await createTree({
      'project/tunestra.yaml': 'extends: ["github:org/presets/team#v1"]\n',
      'repository/team/tunestra.preset.yaml': 'name: team\nlevel: team\nextends: [../base]\n',
      'repository/base/tunestra.preset.yaml': 'name: base\nlevel: base\n',
    });
    const projectDir = join(root, 'project');
    const fake = createFakeDownload({
      'github:org/presets#v1': join(root, 'repository'),
    });

    const chain = await loadChain(projectDir, { download: fake.download });

    const remotes = chain.levels.map((level) => level.remote);
    expect(remotes).toEqual([
      'github:org/presets/base#v1',
      'github:org/presets/team#v1',
      undefined,
    ]);
  });
});

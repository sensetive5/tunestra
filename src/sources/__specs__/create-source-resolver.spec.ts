import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createFakeDownload } from '../../shared/tests/download.ts';
import { createTempDir, createTree } from '../../shared/tests/temp.ts';
import { createSourceResolver } from '../create-source-resolver.ts';

const REPOSITORY = 'github:org/presets#v1';

async function createPresetsRepository(): Promise<string> {
  return createTree({
    'team/tunestra.preset.yaml': 'name: team\nlevel: team\n',
    'base/tunestra.preset.yaml': 'name: base\nlevel: base\n',
  });
}

describe('createSourceResolver', () => {
  it('resolves a local path from the directory that refers to it', async () => {
    const projectDir = await createTempDir('project');
    const resolver = createSourceResolver(projectDir);

    const dir = await resolver.resolve('../presets/team', projectDir);

    expect(dir).toBe(join(projectDir, '../presets/team'));
  });

  it('downloads a repository once for several presets', async () => {
    const projectDir = await createTempDir('project');
    const repositoryDir = await createPresetsRepository();
    const fake = createFakeDownload({
      [REPOSITORY]: repositoryDir,
    });
    const resolver = createSourceResolver(projectDir, fake.download);

    const teamLoading = resolver.resolve('github:org/presets/team#v1', projectDir);
    const baseLoading = resolver.resolve('github:org/presets/base#v1', projectDir);
    const dirs = await Promise.all([teamLoading, baseLoading]);

    const cacheDir = join(projectDir, '.tunestra/state/sources/github/org/presets/v1');
    expect(dirs).toEqual([join(cacheDir, 'team'), join(cacheDir, 'base')]);
    expect(fake.downloaded).toEqual([REPOSITORY]);
  });

  it('lets a preset from git extend another preset of its repository', async () => {
    const projectDir = await createTempDir('project');
    const repositoryDir = await createPresetsRepository();
    const fake = createFakeDownload({
      [REPOSITORY]: repositoryDir,
    });
    const resolver = createSourceResolver(projectDir, fake.download);
    const teamDir = await resolver.resolve('github:org/presets/team#v1', projectDir);

    const baseDir = await resolver.resolve('../base', teamDir);

    const remote = resolver.describeRemote(baseDir);
    expect(remote).toBe('github:org/presets/base#v1');
  });

  it('does not let a preset from git reach outside its repository', async () => {
    const projectDir = await createTempDir('project');
    const repositoryDir = await createPresetsRepository();
    const fake = createFakeDownload({
      [REPOSITORY]: repositoryDir,
    });
    const resolver = createSourceResolver(projectDir, fake.download);
    const teamDir = await resolver.resolve('github:org/presets/team#v1', projectDir);

    const result = resolver.resolve('../../../../../../..', teamDir);

    await expect(result).rejects.toThrow('points outside of github:org/presets#v1');
  });

  it('reports a repository that cannot be downloaded', async () => {
    const projectDir = await createTempDir('project');
    const fake = createFakeDownload({});
    const resolver = createSourceResolver(projectDir, fake.download);

    const result = resolver.resolve('github:org/missing/team#v1', projectDir);

    await expect(result).rejects.toThrow('Could not download github:org/missing#v1');
  });
});

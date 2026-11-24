import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createFakeDownload, type FakeDownload } from '../../shared/tests/download.ts';
import { createTree } from '../../shared/tests/temp.ts';
import { checkExists } from '../../shared/utils/fs.ts';
import { runUninstall } from '../../uninstall/run-uninstall.ts';
import { runSetup, type SetupOptions } from '../run-setup.ts';

const REPOSITORY = 'github:org/presets#v1';
const LOCK_FILE = 'tunestra.lock.yaml';

type LockProject = {
  root: string;
  projectDir: string;
  lockPath: string;
  fake: FakeDownload;
  options: SetupOptions;
};

async function createLockProject(files: Record<string, string> = {}): Promise<LockProject> {
  const root = await createTree({
    'project/tunestra.yaml': 'extends: ["github:org/presets/team#v1"]\n',
    'v1/team/tunestra.preset.yaml': 'name: team\nlevel: team\n',
    'v1/team/rules/style.md': '# Style\n',
    'v2/team/tunestra.preset.yaml': 'name: team\nlevel: team\n',
    'v2/team/rules/style.md': '# Style, version 2\n',
    ...files,
  });
  const fake = createFakeDownload({
    [REPOSITORY]: join(root, 'v1'),
  });
  const projectDir = join(root, 'project');

  return {
    root,
    projectDir,
    lockPath: join(projectDir, LOCK_FILE),
    fake,
    options: {
      dryRun: false,
      download: fake.download,
      resolveCommit: fake.resolveCommit,
    },
  };
}

async function readRule(projectDir: string): Promise<string> {
  const path = join(projectDir, '.agents/rules/20-team-style.md');

  return readFile(path, 'utf8');
}

describe('tunestra.lock.yaml', () => {
  it('locks a git source at the commit of its ref', async () => {
    const project = await createLockProject();
    const commit = project.fake.findCommit(REPOSITORY);

    const report = await runSetup(project.projectDir, project.options);

    const lock = await readFile(project.lockPath, 'utf8');
    const kinds = report.lock.changes.map((change) => change.kind);
    expect(lock).toContain(
      `  github:org/presets#v1:\n    commit: ${commit}\n    integrity: sha256-`,
    );
    expect(kinds).toEqual(['added']);
  });

  it('keeps the locked commit when the tag moves', async () => {
    const project = await createLockProject();
    await runSetup(project.projectDir, project.options);
    const lockBefore = await readFile(project.lockPath, 'utf8');
    project.fake.publish(REPOSITORY, join(project.root, 'v2'));

    const report = await runSetup(project.projectDir, project.options);

    const lockAfter = await readFile(project.lockPath, 'utf8');
    const rule = await readRule(project.projectDir);
    expect(lockAfter).toBe(lockBefore);
    expect(rule).toContain('# Style\n');
    expect(report.lock.changes).toEqual([]);
  });

  it('moves a source to the new commit of its tag on update', async () => {
    const project = await createLockProject();
    await runSetup(project.projectDir, project.options);
    const oldCommit = project.fake.findCommit(REPOSITORY);
    project.fake.publish(REPOSITORY, join(project.root, 'v2'));
    const newCommit = project.fake.findCommit(REPOSITORY);

    const report = await runSetup(project.projectDir, {
      ...project.options,
      update: ['github:org/presets/team#v1'],
    });

    const lock = await readFile(project.lockPath, 'utf8');
    const rule = await readRule(project.projectDir);
    expect(report.lock.changes).toEqual([
      {
        kind: 'moved',
        source: REPOSITORY,
        from: oldCommit,
        to: newCommit,
      },
    ]);
    expect(lock).toContain(newCommit);
    expect(rule).toContain('version 2');
  });

  it('says that a source is current when update finds the same commit', async () => {
    const project = await createLockProject();
    await runSetup(project.projectDir, project.options);

    const report = await runSetup(project.projectDir, {
      ...project.options,
      update: 'all',
    });

    const kinds = report.lock.changes.map((change) => change.kind);
    expect(kinds).toEqual(['current']);
    expect(report.lock.isChanged).toBe(false);
  });

  it('stops when the files at the locked commit differ', async () => {
    const project = await createLockProject();
    await runSetup(project.projectDir, project.options);
    const lock = await readFile(project.lockPath, 'utf8');
    const changedLock = lock.replace(/integrity: .+/, 'integrity: sha256-other');
    await writeFile(project.lockPath, changedLock);

    const result = runSetup(project.projectDir, project.options);

    await expect(result).rejects.toThrow('differ from tunestra.lock.yaml');
  });

  it('writes the integrity again on update when it was wrong', async () => {
    const project = await createLockProject();
    await runSetup(project.projectDir, project.options);
    const lock = await readFile(project.lockPath, 'utf8');
    const changedLock = lock.replace(/integrity: .+/, 'integrity: sha256-other');
    await writeFile(project.lockPath, changedLock);

    const report = await runSetup(project.projectDir, {
      ...project.options,
      update: 'all',
    });

    const fixedLock = await readFile(project.lockPath, 'utf8');
    expect(fixedLock).toBe(lock);
    expect(report.lock.isChanged).toBe(true);
  });

  it('does not write the lock file on a dry run', async () => {
    const project = await createLockProject();

    const report = await runSetup(project.projectDir, {
      ...project.options,
      dryRun: true,
    });

    const hasLock = await checkExists(project.lockPath);
    expect(hasLock).toBe(false);
    expect(report.lock.isChanged).toBe(true);
  });

  it('removes the lock file when no preset comes from git', async () => {
    const project = await createLockProject({
      'presets/team/tunestra.preset.yaml': 'name: team\nlevel: team\n',
    });
    await runSetup(project.projectDir, project.options);
    const configPath = join(project.projectDir, 'tunestra.yaml');
    await writeFile(configPath, 'extends: [../presets/team]\n');

    const report = await runSetup(project.projectDir, project.options);

    const hasLock = await checkExists(project.lockPath);
    const kinds = report.lock.changes.map((change) => change.kind);
    expect(hasLock).toBe(false);
    expect(kinds).toEqual(['removed']);
  });

  it('does not lock the git sources of the personal level', async () => {
    const project = await createLockProject({
      'project/tunestra.yaml': 'extends: [../presets/team]\n',
      'project/tunestra.local.yaml': 'extends: ["github:org/presets/me#v1"]\n',
      'presets/team/tunestra.preset.yaml': 'name: team\nlevel: team\n',
      'v1/me/tunestra.preset.yaml': 'name: me\nlevel: local\n',
    });

    await runSetup(project.projectDir, project.options);

    const hasLock = await checkExists(project.lockPath);
    expect(hasLock).toBe(false);
  });

  it('is removed by uninstall', async () => {
    const project = await createLockProject();
    await runSetup(project.projectDir, project.options);

    const report = await runUninstall(project.projectDir, { dryRun: false });

    const hasLock = await checkExists(project.lockPath);
    expect(hasLock).toBe(false);
    expect(report.removals).toContain(LOCK_FILE);
  });

  it('rejects an update of a source that is not locked', async () => {
    const project = await createLockProject();
    await runSetup(project.projectDir, project.options);

    const result = runSetup(project.projectDir, {
      ...project.options,
      update: ['github:org/other#v1'],
    });

    await expect(result).rejects.toThrow(
      'github:org/other#v1 is not in tunestra.lock.yaml. Locked sources: github:org/presets#v1',
    );
  });
});

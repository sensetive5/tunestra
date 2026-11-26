import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createFakeDownload, type FakeDownload } from '../../../shared/tests/download.ts';
import { createTree } from '../../../shared/tests/temp.ts';
import { describeSetup, type SetupCommandOptions } from '../setup.ts';

const PROJECT = {
  'project/tunestra.yaml': 'extends: [../base]\nagents: [codex]\n',
  'base/tunestra.preset.yaml': 'name: base\nlevel: base\n',
  'base/rules/security.md': '# Security\n',
};

describe('describeSetup', () => {
  it('shows the notes of agents and the files to commit', async () => {
    const root = await createTree(PROJECT);
    const projectDir = join(root, 'project');

    const summary = await describeSetup(projectDir, {
      dryRun: false,
      verbose: false,
    });

    expect(summary).toContain('Generated 3 files, removed 0 stale files.');
    expect(summary).toContain('only in a trusted project');
    expect(summary).toContain('Commit AGENTS.md; the rest is in .gitignore.');
  });

  it('lists the writes and the notes in a dry run', async () => {
    const root = await createTree(PROJECT);
    const projectDir = join(root, 'project');

    const summary = await describeSetup(projectDir, {
      dryRun: true,
      verbose: false,
    });

    expect(summary).toContain('  write   .codex/config.toml');
    expect(summary).toContain('only in a trusted project');
    expect(summary).toContain('Nothing was written (--dry-run).');
  });

  it('also shows where every artifact comes from in verbose mode', async () => {
    const root = await createTree(PROJECT);
    const projectDir = join(root, 'project');

    const summary = await describeSetup(projectDir, {
      dryRun: true,
      verbose: true,
    });

    expect(summary).toContain('../base/rules/security.md');
  });

  describe('with a git source', () => {
    const REPOSITORY = 'github:org/presets#v1';

    type GitProject = {
      root: string;
      projectDir: string;
      fake: FakeDownload;
    };

    async function createGitProject(): Promise<GitProject> {
      const root = await createTree({
        'project/tunestra.yaml': 'extends: ["github:org/presets/base#v1"]\nagents: [codex]\n',
        'v1/base/tunestra.preset.yaml': 'name: base\nlevel: base\n',
        'v2/base/tunestra.preset.yaml': 'name: base\nlevel: base\ndescription: New\n',
        'local/tunestra.preset.yaml': 'name: base\nlevel: base\n',
      });
      const fake = createFakeDownload({
        [REPOSITORY]: join(root, 'v1'),
      });

      return {
        root,
        projectDir: join(root, 'project'),
        fake,
      };
    }

    function createOptions(fake: FakeDownload): SetupCommandOptions {
      return {
        dryRun: false,
        verbose: false,
        download: fake.download,
        resolveCommit: fake.resolveCommit,
      };
    }

    it('says where it locked the source and asks to commit the lock file', async () => {
      const project = await createGitProject();
      const options = createOptions(project.fake);
      const commit = project.fake.findCommit(REPOSITORY).slice(0, 7);

      const summary = await describeSetup(project.projectDir, options);

      expect(summary).toContain(`Locked ${REPOSITORY} at ${commit} in tunestra.lock.yaml.`);
      expect(summary).toContain(
        'Commit AGENTS.md and tunestra.lock.yaml; the rest is in .gitignore.',
      );
    });

    it('shows the old and the new commit after an update', async () => {
      const project = await createGitProject();
      const options = createOptions(project.fake);
      await describeSetup(project.projectDir, options);
      const oldCommit = project.fake.findCommit(REPOSITORY);
      project.fake.publish(REPOSITORY, join(project.root, 'v2'));
      const newCommit = project.fake.findCommit(REPOSITORY);
      const oldShort = oldCommit.slice(0, 7);
      const newShort = newCommit.slice(0, 7);

      const summary = await describeSetup(project.projectDir, {
        ...options,
        update: 'all',
      });

      expect(summary).toContain(`Moved ${REPOSITORY} from ${oldShort} to ${newShort}.`);
      expect(summary).toContain(
        `https://github.com/org/presets/compare/${oldCommit}...${newCommit}`,
      );
    });

    it('prints only a table of the changes with the summary option', async () => {
      const project = await createGitProject();
      const options = createOptions(project.fake);
      await describeSetup(project.projectDir, options);
      project.fake.publish(REPOSITORY, join(project.root, 'v2'));

      const summary = await describeSetup(project.projectDir, {
        ...options,
        update: 'all',
        summary: true,
      });

      expect(summary).toMatch(/^\| Source \| Change \|/);
      expect(summary).toContain(`| \`${REPOSITORY}\` | [`);
      expect(summary).not.toContain('Generated');
    });

    it('says that an updated source is already current', async () => {
      const project = await createGitProject();
      const options = createOptions(project.fake);
      await describeSetup(project.projectDir, options);

      const summary = await describeSetup(project.projectDir, {
        ...options,
        update: 'all',
      });

      expect(summary).toContain(`${REPOSITORY} is already at the latest commit`);
    });

    it('says that it removed a source that no preset extends', async () => {
      const project = await createGitProject();
      const options = createOptions(project.fake);
      await describeSetup(project.projectDir, options);
      const configPath = join(project.projectDir, 'tunestra.yaml');
      await writeFile(configPath, 'extends: [../local]\nagents: [codex]\n');

      const summary = await describeSetup(project.projectDir, options);

      expect(summary).toContain(
        `Removed ${REPOSITORY} from tunestra.lock.yaml: no preset extends it now.`,
      );
      expect(summary).toContain('Commit AGENTS.md; the rest');
    });
  });
});

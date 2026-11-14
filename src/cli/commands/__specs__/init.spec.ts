import { describe, expect, it } from 'vitest';
import { createTempDir, createTree } from '../../../shared/tests/temp.ts';
import { describeInit } from '../init.ts';

describe('describeInit', () => {
  it('asks to add presets when there are none', async () => {
    const projectDir = await createTempDir('init');
    const options = {
      presets: [],
      local: false,
    };

    const text = await describeInit(projectDir, options);

    expect(text).toContain('Created tunestra.yaml');
    expect(text).toContain('Next: add presets to extends in tunestra.yaml');
  });

  it('asks to run setup when there are presets', async () => {
    const projectDir = await createTempDir('init');
    const options = {
      presets: ['../presets/team'],
      local: false,
    };

    const text = await describeInit(projectDir, options);

    expect(text).toContain('Next: run tunestra setup.');
  });

  it('creates the personal level with --local', async () => {
    const projectDir = await createTree({
      'tunestra.yaml': 'name: project\n',
    });
    const options = {
      presets: [],
      local: true,
    };

    const text = await describeInit(projectDir, options);

    expect(text).toContain('Created tunestra.local.yaml');
    expect(text).toContain('Next: add your rules to .tunestra.local/');
  });
});

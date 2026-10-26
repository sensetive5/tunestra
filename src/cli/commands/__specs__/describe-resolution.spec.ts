import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadChain } from '../../../chain/load-chain.ts';
import { applyInheritance } from '../../../inheritance/apply-inheritance.ts';
import { BASIC_INPUT } from '../../../shared/tests/fixtures.ts';
import { describeResolution } from '../describe-resolution.ts';

describe('describeResolution', () => {
  it('shows the level, what is overridden and the file to edit', async () => {
    const projectDir = join(BASIC_INPUT, 'project');
    const chain = await loadChain(projectDir);
    const resolution = applyInheritance(chain);

    const description = describeResolution(resolution);

    expect(description).toContain(
      '  code-style            team, overrides base  ../presets/team/rules/code-style.md',
    );
    expect(description).toContain(
      'MCP servers\n  tracker  base, patched by team  ../presets/base/mcp/tracker.yaml',
    );
  });
});

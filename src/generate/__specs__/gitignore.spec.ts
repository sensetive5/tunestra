import { describe, expect, it } from 'vitest';
import { renderGitignoreBlock, updateGitignore } from '../gitignore.ts';

const BLOCK = renderGitignoreBlock(['.agents/', '.mcp.json']);

describe('renderGitignoreBlock', () => {
  it('anchors paths at the project root', () => {
    const paths = ['.agents/', '.mcp.json'];

    const block = renderGitignoreBlock(paths);

    expect(block).toBe(
      '# >>> tunestra (generated, do not edit)\n/.agents/\n/.mcp.json\n# <<< tunestra',
    );
  });
});

describe('updateGitignore', () => {
  it('creates the file when there is none', () => {
    const existing = undefined;

    const content = updateGitignore(existing, BLOCK);

    expect(content).toBe(`${BLOCK}\n`);
  });

  it('adds the block after the existing lines', () => {
    const existing = 'node_modules/\n';

    const content = updateGitignore(existing, BLOCK);

    expect(content).toBe(`node_modules/\n\n${BLOCK}\n`);
  });

  it('replaces the old block and keeps the lines around it', () => {
    const oldBlock = renderGitignoreBlock(['.old/']);
    const existing = `dist/\n\n${oldBlock}\n\n*.log\n`;

    const content = updateGitignore(existing, BLOCK);

    expect(content).toBe(`dist/\n\n${BLOCK}\n\n*.log\n`);
  });
});

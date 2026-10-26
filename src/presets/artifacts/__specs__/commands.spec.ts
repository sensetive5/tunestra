import { describe, expect, it } from 'vitest';
import { createTree } from '../../../shared/tests/temp.ts';
import { loadCommands } from '../commands.ts';

describe('loadCommands', () => {
  it('keeps the whole file, frontmatter included, because agents read it', async () => {
    const content = '---\ndescription: Draft release notes\nmodel: haiku\n---\nDraft notes.\n';
    const dir = await createTree({
      'commands/release-notes.md': content,
    });

    const [command] = await loadCommands(dir);

    expect(command).toEqual({
      key: 'release-notes',
      source: 'commands/release-notes.md',
      description: 'Draft release notes',
      content,
    });
  });

  it('allows a command without frontmatter', async () => {
    const dir = await createTree({
      'commands/hello.md': 'Say hello.\n',
    });

    const [command] = await loadCommands(dir);

    expect(command?.description).toBeUndefined();
  });

  it('rejects a description that is not text', async () => {
    const dir = await createTree({
      'commands/hello.md': '---\ndescription: [a, b]\n---\n',
    });

    const result = loadCommands(dir);

    await expect(result).rejects.toThrow('description');
  });
});

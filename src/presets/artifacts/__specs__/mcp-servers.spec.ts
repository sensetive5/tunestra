import { describe, expect, it } from 'vitest';
import { createTree } from '../../../shared/tests/temp.ts';
import { loadMcpServers } from '../mcp-servers.ts';

describe('loadMcpServers', () => {
  it('keeps the description apart from the server config', async () => {
    const dir = await createTree({
      'mcp/docs.yaml': 'description: Docs search\nurl: https://docs.example.com/mcp\n',
    });

    const [server] = await loadMcpServers(dir);

    expect(server).toEqual({
      key: 'docs',
      source: 'mcp/docs.yaml',
      description: 'Docs search',
      config: {
        url: 'https://docs.example.com/mcp',
      },
    });
  });

  it('requires either command or url', async () => {
    const dir = await createTree({
      'mcp/a.yaml': 'description: Nothing to run\n',
    });

    const result = loadMcpServers(dir);

    await expect(result).rejects.toThrow('either "command"');
  });

  it('rejects a server with both command and url', async () => {
    const dir = await createTree({
      'mcp/a.yaml': 'command: npx\nurl: https://example.com/mcp\n',
    });

    const result = loadMcpServers(dir);

    await expect(result).rejects.toThrow('either "command"');
  });

  it('rejects an unknown field', async () => {
    const dir = await createTree({
      'mcp/a.yaml': 'command: npx\nenviron:\n  A: B\n',
    });

    const result = loadMcpServers(dir);

    await expect(result).rejects.toThrow('environ');
  });
});

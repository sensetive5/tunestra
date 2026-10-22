import { describe, expect, it } from 'vitest';
import { patchMcpConfig } from '../patch-mcp-config.ts';

describe('patchMcpConfig', () => {
  it('merges env by key and keeps the command', () => {
    const config = {
      command: 'npx',
      args: ['-y', 'server'],
      env: {
        URL: 'https://example.com',
        QUEUE: 'COMMON',
      },
    };
    const patch = {
      env: {
        QUEUE: 'TEAM',
      },
    };

    const patched = patchMcpConfig(config, patch);

    expect(patched).toEqual({
      command: 'npx',
      args: ['-y', 'server'],
      env: {
        URL: 'https://example.com',
        QUEUE: 'TEAM',
      },
    });
  });

  it('replaces command and args as a whole', () => {
    const config = {
      command: 'npx',
      args: ['-y', 'server'],
    };
    const patch = {
      command: 'node',
      args: ['server.js'],
    };

    const patched = patchMcpConfig(config, patch);

    expect(patched).toEqual({
      command: 'node',
      args: ['server.js'],
    });
  });

  it('merges headers of a remote server', () => {
    const config = {
      url: 'https://example.com/mcp',
      headers: {
        Accept: 'json',
      },
    };
    const patch = {
      headers: {
        Authorization: 'Bearer <token>',
      },
    };

    const patched = patchMcpConfig(config, patch);

    expect(patched.headers).toEqual({
      Accept: 'json',
      Authorization: 'Bearer <token>',
    });
  });
});

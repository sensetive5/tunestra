import { describe, expect, it } from 'vitest';
import { isIgnoredByClaude } from '../ignored-env.ts';

describe('isIgnoredByClaude', () => {
  it('ignores variables that turn telemetry on or choose where it goes', () => {
    const names = [
      'CLAUDE_CODE_ENABLE_TELEMETRY',
      'OTEL_EXPORTER_OTLP_ENDPOINT',
      'OTEL_EXPORTER_OTLP_METRICS_HEADERS',
    ];

    const ignored = names.map((name) => isIgnoredByClaude(name, '1'));

    expect(ignored).toEqual([true, true, true]);
  });

  it('ignores the families of directory and accessibility variables', () => {
    const names = ['XDG_CONFIG_HOME', 'ProgramFiles(x86)', 'CLAUDE_AX_SCREEN_READER', 'HOME'];

    const ignored = names.map((name) => isIgnoredByClaude(name, 'value'));

    expect(ignored).toEqual([true, true, true, true]);
  });

  it('accepts values that turn telemetry off', () => {
    const exporter = isIgnoredByClaude('OTEL_LOGS_EXPORTER', 'none');
    const prompts = isIgnoredByClaude('OTEL_LOG_USER_PROMPTS', '0');

    expect(exporter).toBe(false);
    expect(prompts).toBe(false);
  });

  it('accepts other variables', () => {
    const names = ['MCP_TIMEOUT', 'OTEL_EXPORTER_OTLP_TIMEOUT', 'HTTPS_PROXY'];

    const ignored = names.map((name) => isIgnoredByClaude(name, '1'));

    expect(ignored).toEqual([false, false, false]);
  });
});

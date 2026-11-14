import { Agent } from '../shared/constants/agents.ts';

const EXTENDS_EXAMPLE = '#   - github:<owner>/<repo>/<path>#<ref>';

const LOCAL_EXTENDS_EXAMPLE = '#   - ~/presets/me';

/** The first tunestra.yaml of a project, with a hint when there are no presets yet. */
export function renderConfig(presets: ReadonlyArray<string>): string {
  const hasPresets = presets.length > 0;
  const presetLines = presets.map((preset) => `  - ${JSON.stringify(preset)}`);
  const extendsLines = hasPresets ? ['extends:', ...presetLines] : ['extends: []', EXTENDS_EXAMPLE];

  return [
    '# tunestra: https://github.com/sensetive5/tunestra',
    '# Presets, from general to specific:',
    ...extendsLines,
    'agents:',
    `  - ${Agent.Claude}`,
    '',
  ].join('\n');
}

/** The first tunestra.local.yaml, with commented examples of what a personal level can do. */
export function renderLocalConfig(presets: ReadonlyArray<string>): string {
  const hasPresets = presets.length > 0;
  const presetLines = presets.map((preset) => `  - ${JSON.stringify(preset)}`);
  const extendsLines = hasPresets
    ? ['extends:', ...presetLines]
    : ['extends: []', LOCAL_EXTENDS_EXAMPLE];

  return [
    '# Your personal level of tunestra: only for you, never committed.',
    '# Personal presets with level: local, from general to specific:',
    ...extendsLines,
    '# exclude:',
    '#   skills: [<skill>]',
    '# env:',
    '#   HTTPS_PROXY: http://localhost:3128',
    '# permissions:',
    '#   allow: [Bash(make *)]',
    '',
  ].join('\n');
}

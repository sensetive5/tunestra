import { Agent } from '../shared/constants/agents.ts';

const EXTENDS_EXAMPLE = '#   - github:<owner>/<repo>/<path>#<ref>';

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

import pc from 'picocolors';
import { type InitOptions, runInit } from '../../init/run-init.ts';

export async function describeInit(projectDir: string, options: InitOptions): Promise<string> {
  const report = await runInit(projectDir, options);
  const check = pc.green('✔');
  const warningIcon = pc.yellow('⚠');
  const steps = report.steps.map((step) => `${check} ${step}`);
  const warnings = report.warnings.map((warning) => `${warningIcon} ${warning}`);
  const hasPresets = options.presets.length > 0;
  const nextStep = hasPresets
    ? 'Next: run tunestra setup.'
    : 'Next: add presets to extends in tunestra.yaml, then run tunestra setup.';

  return [...steps, ...warnings, '', nextStep].join('\n');
}

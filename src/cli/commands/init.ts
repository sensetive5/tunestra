import pc from 'picocolors';
import { type InitOptions, type InitReport, runInit } from '../../init/run-init.ts';
import { runInitLocal } from '../../init/run-init-local.ts';

export type InitCommandOptions = InitOptions & {
  /** Create only the personal level, in a project that already has tunestra.yaml. */
  local: boolean;
};

export async function describeInit(
  projectDir: string,
  options: InitCommandOptions,
): Promise<string> {
  const report = options.local
    ? await runInitLocal(projectDir, options)
    : await runInit(projectDir, options);
  const nextStep = describeNextStep(options);

  return [...describeReport(report), '', nextStep].join('\n');
}

function describeReport(report: InitReport): ReadonlyArray<string> {
  const check = pc.green('✔');
  const warningIcon = pc.yellow('⚠');
  const steps = report.steps.map((step) => `${check} ${step}`);
  const warnings = report.warnings.map((warning) => `${warningIcon} ${warning}`);

  return [...steps, ...warnings];
}

function describeNextStep(options: InitCommandOptions): string {
  const hasPresets = options.presets.length > 0;

  if (options.local) {
    return 'Next: add your rules to .tunestra.local/ or presets to tunestra.local.yaml, then run tunestra setup. setup puts both in .gitignore.';
  }

  if (hasPresets) {
    return 'Next: run tunestra setup.';
  }

  return 'Next: add presets to extends in tunestra.yaml, then run tunestra setup.';
}

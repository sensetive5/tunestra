import pc from 'picocolors';
import { runUninstall, type UninstallOptions } from '../../uninstall/run-uninstall.ts';

export async function describeUninstall(
  projectDir: string,
  options: UninstallOptions,
): Promise<string> {
  const report = await runUninstall(projectDir, options);
  const warningIcon = pc.yellow('⚠');
  const lines = report.warnings.map((warning) => `${warningIcon} ${warning}`);
  const count = report.removals.length;

  if (options.dryRun) {
    const removals = report.removals.map((path) => `  remove  ${path}`);

    lines.push(...removals, '', 'Nothing was removed (--dry-run).');

    return lines.join('\n');
  }

  const check = pc.green('✔');

  lines.push(`${check} Removed ${count} generated files and the tunestra block in .gitignore.`);
  lines.push('tunestra.yaml and .tunestra/ are kept: they are your sources.');

  return lines.join('\n');
}

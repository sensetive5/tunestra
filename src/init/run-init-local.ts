import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { LOCAL_CONFIG, LOCAL_DIR, PROJECT_CONFIG } from '../shared/constants/files.ts';
import { createProblemsError } from '../shared/errors/create-problems-error.ts';
import { checkExists } from '../shared/utils/fs.ts';
import { renderLocalConfig } from './render-config.ts';
import type { InitOptions, InitReport } from './run-init.ts';

const LOCAL_RULES_DIR = `${LOCAL_DIR}/rules`;

/**
 * Creates the personal level in a project that already uses tunestra: tunestra.local.yaml
 * and `.tunestra.local/rules/` for the first personal rule.
 */
export async function runInitLocal(projectDir: string, options: InitOptions): Promise<InitReport> {
  const configPath = join(projectDir, PROJECT_CONFIG);
  const localPath = join(projectDir, LOCAL_CONFIG);
  const rulesDir = join(projectDir, LOCAL_RULES_DIR);
  const hasConfig = await checkExists(configPath);
  const hasLocal = await checkExists(localPath);
  const problems: Array<string> = [];

  if (hasConfig === false) {
    problems.push(`${PROJECT_CONFIG} not found. Run \`tunestra init\` first`);
  }

  if (hasLocal) {
    problems.push(`${LOCAL_CONFIG} already exists`);
  }

  if (problems.length > 0) {
    throw createProblemsError(problems);
  }

  const config = renderLocalConfig(options.presets);

  await writeFile(localPath, config);
  await mkdir(rulesDir, { recursive: true });

  return {
    steps: [`Created ${LOCAL_CONFIG}`, `Created ${LOCAL_RULES_DIR}/`],
    warnings: [],
  };
}

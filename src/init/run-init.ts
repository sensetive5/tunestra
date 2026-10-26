import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { INSTRUCTIONS_FILE, PROJECT_CONFIG, PROJECT_DIR } from '../shared/constants/files.ts';
import { GENERATED_MARKER } from '../shared/constants/output.ts';
import { createProblemsError } from '../shared/errors/create-problems-error.ts';
import { checkExists, readFileIfExists } from '../shared/utils/fs.ts';
import { renderConfig } from './render-config.ts';

const CLAUDE_FILE = 'CLAUDE.md';
const CLAUDE_RULE = `${PROJECT_DIR}/rules/claude-md.md`;
const PROJECT_INSTRUCTIONS = `${PROJECT_DIR}/${INSTRUCTIONS_FILE}`;
const CLAUDE_IMPORT = `@${INSTRUCTIONS_FILE}`;

export type InitOptions = {
  /** References for `extends`, from general to specific. */
  presets: ReadonlyArray<string>;
};

export type InitReport = {
  /** What init did, in plain words, in order. */
  steps: ReadonlyArray<string>;
  warnings: ReadonlyArray<string>;
};

/**
 * Creates tunestra.yaml. Hand-written AGENTS.md and CLAUDE.md become sources in .tunestra/,
 * because setup will generate both files from now on.
 */
export async function runInit(projectDir: string, options: InitOptions): Promise<InitReport> {
  const configPath = join(projectDir, PROJECT_CONFIG);
  const agentsPath = join(projectDir, INSTRUCTIONS_FILE);
  const claudePath = join(projectDir, CLAUDE_FILE);

  const hasConfig = await checkExists(configPath);
  const agentsContent = await readHandWritten(agentsPath);
  const claudeContent = await readHandWritten(claudePath);
  const problems = await findConflicts(projectDir, hasConfig, agentsContent, claudeContent);

  if (problems.length > 0) {
    throw createProblemsError(problems);
  }

  const steps: Array<string> = [];
  const warnings: Array<string> = [];

  if (typeof agentsContent === 'string') {
    await moveFile(projectDir, INSTRUCTIONS_FILE, PROJECT_INSTRUCTIONS);

    steps.push(`Moved ${INSTRUCTIONS_FILE} to ${PROJECT_INSTRUCTIONS}`);
  }

  if (typeof claudeContent === 'string') {
    const onlyImportsAgents = claudeContent.trim() === CLAUDE_IMPORT;
    const hasImports = claudeContent.includes('@');

    if (onlyImportsAgents) {
      await rm(claudePath);

      steps.push(`Removed ${CLAUDE_FILE}: it only imported ${INSTRUCTIONS_FILE}`);
    } else {
      await moveFile(projectDir, CLAUDE_FILE, CLAUDE_RULE);

      steps.push(`Moved ${CLAUDE_FILE} to ${CLAUDE_RULE}`);

      if (hasImports) {
        warnings.push(
          `${CLAUDE_RULE} may have @imports; their paths are relative to the old place, so check them`,
        );
      }
    }
  }

  const config = renderConfig(options.presets);

  await writeFile(configPath, config);

  steps.push(`Created ${PROJECT_CONFIG}`);

  return {
    steps,
    warnings,
  };
}

/** The text of a file that people wrote; a file that tunestra generated does not count. */
async function readHandWritten(path: string): Promise<string | undefined> {
  const content = await readFileIfExists(path);
  const isGenerated = content?.startsWith(GENERATED_MARKER) === true;

  if (isGenerated) {
    return undefined;
  }

  return content;
}

async function findConflicts(
  projectDir: string,
  hasConfig: boolean,
  agentsContent: string | undefined,
  claudeContent: string | undefined,
): Promise<ReadonlyArray<string>> {
  const problems: Array<string> = [];
  const instructionsPath = join(projectDir, PROJECT_INSTRUCTIONS);
  const claudeRulePath = join(projectDir, CLAUDE_RULE);
  const hasInstructions = await checkExists(instructionsPath);
  const hasClaudeRule = await checkExists(claudeRulePath);

  if (hasConfig) {
    problems.push(`${PROJECT_CONFIG} already exists. Run tunestra setup instead`);
  }

  if (typeof agentsContent === 'string' && hasInstructions) {
    problems.push(
      `${PROJECT_INSTRUCTIONS} already exists, so ${INSTRUCTIONS_FILE} cannot move there`,
    );
  }

  if (typeof claudeContent === 'string' && hasClaudeRule) {
    problems.push(`${CLAUDE_RULE} already exists, so ${CLAUDE_FILE} cannot move there`);
  }

  return problems;
}

async function moveFile(projectDir: string, from: string, to: string): Promise<void> {
  const fromPath = join(projectDir, from);
  const toPath = join(projectDir, to);
  const toDir = dirname(toPath);

  await mkdir(toDir, { recursive: true });
  await rename(fromPath, toPath);
}

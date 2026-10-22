import { join } from 'node:path';
import { AGENT_ADAPTERS } from '../agents/adapters.ts';
import { createProblemsError } from '../errors.ts';
import { INSTRUCTIONS_FILE } from '../shared/constants/files.ts';
import {
  AGENTS_DIR,
  AGENTS_RULES_DIR,
  AGENTS_SKILLS_DIR,
  OutputKind,
  STATE_DIR,
} from '../shared/constants/output.ts';
import type { Output, OutputCopy, OutputFile, SetupPlan } from '../shared/types/output.ts';
import type { Rule, Skill } from '../shared/types/preset.ts';
import type { Resolution, ResolvedArtifact } from '../shared/types/resolution.ts';
import { createFileOutput } from '../shared/utils/outputs.ts';
import { renderAgentsIndex } from './agents-index.ts';
import { buildRuleFileName, renderRuleFile } from './rule-file.ts';

/**
 * Builds every output without touching the disk: the shared files that any agent can read
 * (AGENTS.md, `.agents/`), then the native files of each agent of the project.
 */
export function planSetup(resolution: Resolution): SetupPlan {
  const index = renderAgentsIndex(resolution);
  const indexFile = createFileOutput(INSTRUCTIONS_FILE, index);
  const ruleFiles = resolution.rules.map(planRuleFile);
  const skillCopies = resolution.skills.flatMap(planSkillCopies);
  const outputs: Array<Output> = [indexFile, ...ruleFiles, ...skillCopies];
  const ignoredPaths: Array<string> = [`${AGENTS_DIR}/`];
  const protectedPaths: Array<string> = [INSTRUCTIONS_FILE];

  const context = {
    resolution,
    ruleFiles,
  };

  for (const agent of resolution.chain.project.agents) {
    const adapter = AGENT_ADAPTERS[agent];
    const agentPlan = adapter.plan(context);

    outputs.push(...agentPlan.outputs);
    ignoredPaths.push(...agentPlan.ignoredPaths);
    protectedPaths.push(...agentPlan.protectedPaths);
  }

  ignoredPaths.push(`${STATE_DIR}/`);

  const problems = findPathConflicts(outputs);

  if (problems.length > 0) {
    throw createProblemsError(problems);
  }

  return {
    outputs,
    ignoredPaths,
    protectedPaths,
  };
}

function planRuleFile(rule: ResolvedArtifact<Rule>): OutputFile {
  const fileName = buildRuleFileName(rule);
  const path = `${AGENTS_RULES_DIR}/${fileName}`;
  const content = renderRuleFile(rule);

  return createFileOutput(path, content);
}

/** The skill is copied as a whole, with every file of its directory. */
function planSkillCopies(skill: ResolvedArtifact<Skill>): ReadonlyArray<OutputCopy> {
  const sourceDir = join(skill.origin.artifactsDir, skill.artifact.source);
  const outputDir = `${AGENTS_SKILLS_DIR}/${skill.artifact.key}`;

  return skill.artifact.files.map((file) => {
    const path = `${outputDir}/${file}`;
    const from = join(sourceDir, file);

    return {
      kind: OutputKind.Copy,
      path,
      from,
    };
  });
}

/** Two outputs at one path would silently overwrite each other. */
function findPathConflicts(outputs: ReadonlyArray<Output>): ReadonlyArray<string> {
  const seen = new Set<string>();
  const problems: Array<string> = [];

  for (const output of outputs) {
    const isTaken = seen.has(output.path);

    if (isTaken) {
      problems.push(`Two generated files have the same path: ${output.path}`);
    }

    seen.add(output.path);
  }

  return problems;
}

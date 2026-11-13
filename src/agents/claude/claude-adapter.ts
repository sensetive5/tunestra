import { posix } from 'node:path';
import { describeArtifactSource, SETUP_SOURCE } from '../../generate/describe-source.ts';
import { Agent } from '../../shared/constants/agents.ts';
import { INSTRUCTIONS_FILE } from '../../shared/constants/files.ts';
import { AGENTS_SKILLS_DIR, GENERATED_NOTICE, OutputKind } from '../../shared/constants/output.ts';
import { createProblemsError } from '../../shared/errors/create-problems-error.ts';
import type { AgentAdapter, AgentPlanContext } from '../../shared/types/agent-adapter.ts';
import type { Output, OutputFile, SetupPlan } from '../../shared/types/output.ts';
import type { EnvVariable, PermissionRule, Skill } from '../../shared/types/preset.ts';
import type { ResolvedArtifact } from '../../shared/types/resolution.ts';
import { createFileOutput } from '../../shared/utils/outputs.ts';
import { isIgnoredByClaude } from './ignored-env.ts';
import { renderMcpJson } from './mcp-json.ts';
import { renderSettingsJson, SETTINGS_KEYS } from './settings-json.ts';
import { renderSubagentMd } from './subagent-md.ts';

const CLAUDE_FILE = 'CLAUDE.md';
const RULES_DIR = '.claude/rules/tunestra';
const SKILLS_DIR = '.claude/skills';
const COMMANDS_DIR = '.claude/commands';
const SUBAGENTS_DIR = '.claude/agents';
const MCP_FILE = '.mcp.json';
const MCP_SOURCE = 'the mcp/ folders of tunestra.yaml and its presets';
const SETTINGS_FILE = '.claude/settings.json';
const SETTINGS_SOURCE = 'env and permissions in tunestra.yaml and its presets';
const LOCAL_SETTINGS_FILE = '.claude/settings.local.json';

/**
 * Claude Code reads CLAUDE.md, so it imports AGENTS.md. Rules are copied to `.claude/rules`,
 * which Claude Code loads in every session; a symlink to a directory outside `.claude`
 * would need an approval. Skills are symlinks to the shared `.agents/skills`. Environment
 * variables and permissions go to `.claude/settings.json`, which the team commits;
 * `settings.local.json` stays for personal settings.
 */
export const claudeAdapter: AgentAdapter = {
  agent: Agent.Claude,
  plan: planClaude,
};

function planClaude(context: AgentPlanContext): SetupPlan {
  const { resolution, ruleFiles } = context;
  const projectDir = resolution.chain.project.dir;
  const claudeContent = `${GENERATED_NOTICE}\n@${INSTRUCTIONS_FILE}\n`;
  const claudeFile = createFileOutput(CLAUDE_FILE, claudeContent, SETUP_SOURCE);
  const ruleCopies = ruleFiles.map(copyRule);
  const skillLinks = resolution.skills.map((skill) => linkSkill(projectDir, skill));
  const commandFiles = resolution.commands.map((command) => {
    const path = `${COMMANDS_DIR}/${command.artifact.key}.md`;
    const source = describeArtifactSource(projectDir, command.origin, command.artifact.source);

    return createFileOutput(path, command.artifact.content, source);
  });
  const subagentFiles = resolution.subagents.map((subagent) => {
    const path = `${SUBAGENTS_DIR}/${subagent.artifact.key}.md`;
    const content = renderSubagentMd(subagent.artifact);
    const source = describeArtifactSource(projectDir, subagent.origin, subagent.artifact.source);

    return createFileOutput(path, content, source);
  });
  const outputs: Array<Output> = [
    claudeFile,
    ...ruleCopies,
    ...skillLinks,
    ...commandFiles,
    ...subagentFiles,
  ];

  const hasMcpServers = resolution.mcp.length > 0;

  if (hasMcpServers) {
    const mcpJson = renderMcpJson(resolution.mcp);
    const mcpFile = createFileOutput(MCP_FILE, mcpJson, MCP_SOURCE);

    outputs.push(mcpFile);
  }

  const protectedPaths = [CLAUDE_FILE];
  const hasSettings = resolution.env.length > 0 || resolution.permissions.length > 0;

  if (hasSettings) {
    const settingsFile = planSettingsFile(resolution.env, resolution.permissions);

    outputs.push(settingsFile);
    protectedPaths.push(SETTINGS_FILE);
  }

  return {
    outputs,
    ignoredPaths: [
      `${RULES_DIR}/`,
      `${SKILLS_DIR}/`,
      `${COMMANDS_DIR}/`,
      `${SUBAGENTS_DIR}/`,
      MCP_FILE,
    ],
    protectedPaths,
    notes: [],
  };
}

/** Claude Code drops some variables from project settings; setup says so instead. */
function planSettingsFile(
  env: ReadonlyArray<ResolvedArtifact<EnvVariable>>,
  permissions: ReadonlyArray<ResolvedArtifact<PermissionRule>>,
): OutputFile {
  const ignored = env.filter((variable) =>
    isIgnoredByClaude(variable.artifact.key, variable.artifact.value),
  );
  const problems = ignored.map(
    (variable) =>
      `${variable.origin.name}: env sets ${variable.artifact.key}, but Claude Code ignores it in project settings. Set it in managed settings, ~/.claude/settings.json or your shell`,
  );

  if (problems.length > 0) {
    throw createProblemsError(problems);
  }

  const settings = {
    env,
    permissions,
  };
  const content = renderSettingsJson(settings);
  const file = createFileOutput(SETTINGS_FILE, content, SETTINGS_SOURCE);
  const ownership = {
    keys: SETTINGS_KEYS,
    otherKeysTarget: `${LOCAL_SETTINGS_FILE} or ~/.claude/settings.json`,
  };

  return {
    ...file,
    ownership,
  };
}

function copyRule(ruleFile: OutputFile): OutputFile {
  const fileName = posix.basename(ruleFile.path);
  const path = `${RULES_DIR}/${fileName}`;

  return createFileOutput(path, ruleFile.content, ruleFile.source);
}

function linkSkill(projectDir: string, skill: ResolvedArtifact<Skill>): Output {
  const { key } = skill.artifact;
  const path = `${SKILLS_DIR}/${key}`;
  const target = `../../${AGENTS_SKILLS_DIR}/${key}`;
  const source = describeArtifactSource(projectDir, skill.origin, skill.artifact.source);

  return {
    kind: OutputKind.Symlink,
    path,
    source,
    target,
  };
}

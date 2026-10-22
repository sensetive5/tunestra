import { posix } from 'node:path';
import { Agent } from '../../shared/constants/agents.ts';
import { INSTRUCTIONS_FILE } from '../../shared/constants/files.ts';
import { AGENTS_SKILLS_DIR, GENERATED_NOTICE, OutputKind } from '../../shared/constants/output.ts';
import type { AgentAdapter, AgentPlanContext } from '../../shared/types/agent-adapter.ts';
import type { Output, OutputFile, SetupPlan } from '../../shared/types/output.ts';
import { createFileOutput } from '../../shared/utils/outputs.ts';
import { renderMcpJson } from './mcp-json.ts';

const CLAUDE_FILE = 'CLAUDE.md';
const RULES_DIR = '.claude/rules/tunestra';
const SKILLS_DIR = '.claude/skills';
const COMMANDS_DIR = '.claude/commands';
const MCP_FILE = '.mcp.json';

/**
 * Claude Code reads CLAUDE.md, so it imports AGENTS.md. Rules are copied to `.claude/rules`,
 * which Claude Code loads in every session; a symlink to a directory outside `.claude`
 * would need an approval. Skills are symlinks to the shared `.agents/skills`.
 */
export const claudeAdapter: AgentAdapter = {
  agent: Agent.Claude,
  plan: planClaude,
};

function planClaude(context: AgentPlanContext): SetupPlan {
  const { resolution, ruleFiles } = context;
  const claudeContent = `${GENERATED_NOTICE}\n@${INSTRUCTIONS_FILE}\n`;
  const claudeFile = createFileOutput(CLAUDE_FILE, claudeContent);
  const ruleCopies = ruleFiles.map(copyRule);
  const skillLinks = resolution.skills.map((skill) => linkSkill(skill.artifact.key));
  const commandFiles = resolution.commands.map((command) => {
    const path = `${COMMANDS_DIR}/${command.artifact.key}.md`;

    return createFileOutput(path, command.artifact.content);
  });
  const outputs: Array<Output> = [claudeFile, ...ruleCopies, ...skillLinks, ...commandFiles];

  const hasMcpServers = resolution.mcp.length > 0;

  if (hasMcpServers) {
    const mcpJson = renderMcpJson(resolution.mcp);
    const mcpFile = createFileOutput(MCP_FILE, mcpJson);

    outputs.push(mcpFile);
  }

  return {
    outputs,
    ignoredPaths: [`${RULES_DIR}/`, `${SKILLS_DIR}/`, `${COMMANDS_DIR}/`, MCP_FILE],
    protectedPaths: [CLAUDE_FILE],
  };
}

function copyRule(ruleFile: OutputFile): OutputFile {
  const fileName = posix.basename(ruleFile.path);
  const path = `${RULES_DIR}/${fileName}`;

  return createFileOutput(path, ruleFile.content);
}

function linkSkill(key: string): Output {
  const path = `${SKILLS_DIR}/${key}`;
  const target = `../../${AGENTS_SKILLS_DIR}/${key}`;

  return {
    kind: OutputKind.Symlink,
    path,
    target,
  };
}

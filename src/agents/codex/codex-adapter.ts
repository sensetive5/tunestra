import { Agent } from '../../shared/constants/agents.ts';
import { skillName } from '../../shared/schemas/preset.ts';
import type { AgentAdapter, AgentPlanContext } from '../../shared/types/agent-adapter.ts';
import type { Output, OutputFile, SetupPlan } from '../../shared/types/output.ts';
import type { EnvVariable, McpServer, PermissionRule } from '../../shared/types/preset.ts';
import type { ResolvedArtifact } from '../../shared/types/resolution.ts';
import { createFileOutput } from '../../shared/utils/outputs.ts';
import { planCommandSkill } from './command-skill.ts';
import { renderConfigToml } from './config-toml.ts';
import {
  convertBashRule,
  createExecRule,
  type ExecRule,
  hasCodexDecision,
  renderExecRules,
} from './exec-rules.ts';

const CONFIG_FILE = '.codex/config.toml';
const CONFIG_SOURCE = 'the rules/ and mcp/ folders and env of tunestra.yaml and its presets';
const EXEC_RULES_FILE = '.codex/rules/tunestra.rules';
const EXEC_RULES_SOURCE = 'permissions in tunestra.yaml and its presets';

const INSTRUCTIONS_INTRO =
  'Rules of this project, ordered from specific to general. When two rules conflict, follow the one that comes first.';

const TRUST_NOTE =
  'Codex reads .codex/ only in a trusted project: trust the project when Codex asks.';

/**
 * Codex reads AGENTS.md and the skills in `.agents/skills` by itself. Rules go to
 * `developer_instructions` in `.codex/config.toml`, because Codex does not follow the links
 * in AGENTS.md; MCP servers and env go to the same file. Commands become skills, and
 * permission rules for shell commands become `.codex/rules/tunestra.rules`.
 */
export const codexAdapter: AgentAdapter = {
  agent: Agent.Codex,
  plan: planCodex,
};

function planCodex(context: AgentPlanContext): SetupPlan {
  const { resolution, ruleFiles } = context;
  const projectDir = resolution.chain.project.dir;
  const notes: Array<string> = [];
  const outputs: Array<Output> = [];

  const commands = resolution.commands.filter((command) => {
    const isSkillName = skillName.safeParse(command.artifact.key).success;

    if (isSkillName) {
      return true;
    }

    notes.push(
      `Codex skips the command "${command.artifact.key}": a skill name needs lowercase letters, digits and single hyphens.`,
    );

    return false;
  });
  const commandSkills = commands.flatMap((command) => planCommandSkill(projectDir, command));

  outputs.push(...commandSkills);

  const servers = resolution.mcp.filter((server) => {
    const isSse = server.artifact.config.type === 'sse';

    if (isSse) {
      notes.push(
        `Codex skips the MCP server "${server.artifact.key}": Codex does not support SSE.`,
      );

      return false;
    }

    return true;
  });
  const configFile = planConfigFile(ruleFiles, servers, resolution.env);
  const execRules = planExecRules(resolution.permissions);
  const ignoredPaths: Array<string> = [];

  notes.push(...execRules.notes);

  if (typeof configFile === 'object') {
    outputs.push(configFile);
    ignoredPaths.push(CONFIG_FILE);
  }

  if (typeof execRules.file === 'object') {
    outputs.push(execRules.file);
    ignoredPaths.push(EXEC_RULES_FILE);
  }

  const hasCodexConfig = ignoredPaths.length > 0;

  if (hasCodexConfig) {
    notes.push(TRUST_NOTE);
  }

  return {
    outputs,
    ignoredPaths,
    protectedPaths: [],
    notes,
  };
}

type ExecRulesPlan = {
  file: OutputFile | undefined;
  notes: ReadonlyArray<string>;
};

/**
 * `deny` and `ask` rules for Bash commands become prefix rules of Codex. Codex has no rules
 * for files, the web or MCP tools, and `allow` would mean more in Codex, so those are skipped.
 */
function planExecRules(
  permissions: ReadonlyArray<ResolvedArtifact<PermissionRule>>,
): ExecRulesPlan {
  const execRules: Array<ExecRule> = [];
  const skippedRules: Array<string> = [];
  const allowRules: Array<string> = [];

  for (const resolved of permissions) {
    const { key, decision } = resolved.artifact;

    if (hasCodexDecision(decision) === false) {
      allowRules.push(key);

      continue;
    }

    const pattern = convertBashRule(key);

    if (pattern === undefined) {
      skippedRules.push(key);

      continue;
    }

    const execRule = createExecRule(resolved, decision, pattern);

    execRules.push(execRule);
  }

  const notes: Array<string> = [];
  const hasSkippedRules = skippedRules.length > 0;
  const hasAllowRules = allowRules.length > 0;

  if (hasSkippedRules) {
    const rules = skippedRules.join(', ');

    notes.push(
      `Codex skips permission rules that it cannot enforce: ${rules}. Codex rules match only the start of a shell command.`,
    );
  }

  if (hasAllowRules) {
    const rules = allowRules.join(', ');

    notes.push(
      `Codex skips allow rules: ${rules}. In Codex, an allowed command runs outside the sandbox without asking.`,
    );
  }

  const hasExecRules = execRules.length > 0;

  if (hasExecRules) {
    const content = renderExecRules(execRules);
    const file = createFileOutput(EXEC_RULES_FILE, content, EXEC_RULES_SOURCE);

    return {
      file,
      notes,
    };
  }

  return {
    file: undefined,
    notes,
  };
}

function planConfigFile(
  ruleFiles: ReadonlyArray<OutputFile>,
  servers: ReadonlyArray<ResolvedArtifact<McpServer>>,
  env: ReadonlyArray<ResolvedArtifact<EnvVariable>>,
): OutputFile | undefined {
  const hasRules = ruleFiles.length > 0;
  const hasServers = servers.length > 0;
  const hasEnv = env.length > 0;

  if (hasRules === false && hasServers === false && hasEnv === false) {
    return undefined;
  }

  const instructions = hasRules ? renderInstructions(ruleFiles) : undefined;
  const config = {
    instructions,
    servers,
    env,
  };
  const content = renderConfigToml(config);

  return createFileOutput(CONFIG_FILE, content, CONFIG_SOURCE);
}

/** The rule files as they are, with the header that names the source of each. */
function renderInstructions(ruleFiles: ReadonlyArray<OutputFile>): string {
  const rules = ruleFiles.map((file) => file.content.trimEnd());
  const text = [INSTRUCTIONS_INTRO, ...rules].join('\n\n');

  return `${text}\n`;
}

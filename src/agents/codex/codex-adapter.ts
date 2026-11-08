import { Agent } from '../../shared/constants/agents.ts';
import { skillName } from '../../shared/schemas/preset.ts';
import type { AgentAdapter, AgentPlanContext } from '../../shared/types/agent-adapter.ts';
import type { Output, OutputFile, SetupPlan } from '../../shared/types/output.ts';
import type { EnvVariable, McpServer } from '../../shared/types/preset.ts';
import type { ResolvedArtifact } from '../../shared/types/resolution.ts';
import { createFileOutput } from '../../shared/utils/outputs.ts';
import { planCommandSkill } from './command-skill.ts';
import { renderConfigToml } from './config-toml.ts';

const CONFIG_FILE = '.codex/config.toml';
const CONFIG_SOURCE = 'the rules/ and mcp/ folders and env of tunestra.yaml and its presets';

const INSTRUCTIONS_INTRO =
  'Rules of this project, ordered from specific to general. When two rules conflict, follow the one that comes first.';

const TRUST_NOTE =
  'Codex reads .codex/config.toml only in a trusted project: trust the project when Codex asks.';

/**
 * Codex reads AGENTS.md and the skills in `.agents/skills` by itself. Rules go to
 * `developer_instructions` in `.codex/config.toml`, because Codex does not follow the links
 * in AGENTS.md; MCP servers go to the same file. Commands become skills.
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

  if (configFile === undefined) {
    return {
      outputs,
      ignoredPaths: [],
      protectedPaths: [],
      notes,
    };
  }

  outputs.push(configFile);
  notes.push(TRUST_NOTE);

  return {
    outputs,
    ignoredPaths: [CONFIG_FILE],
    protectedPaths: [],
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

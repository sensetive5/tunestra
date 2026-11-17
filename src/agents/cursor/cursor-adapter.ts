import { posix } from 'node:path';
import { planCommandSkill, selectCommandSkills } from '../../generate/command-skill.ts';
import { describeArtifactSource } from '../../generate/describe-source.ts';
import { renderLocalChanges } from '../../generate/local-changes.ts';
import { Agent } from '../../shared/constants/agents.ts';
import { LOCAL_CONFIG, LOCAL_DIR } from '../../shared/constants/files.ts';
import type {
  AgentAdapter,
  AgentPlanContext,
  LocalPlan,
  LocalPlanContext,
} from '../../shared/types/agent-adapter.ts';
import type { Output, OutputFile, SetupPlan } from '../../shared/types/output.ts';
import type { PermissionRule, Subagent } from '../../shared/types/preset.ts';
import type { ResolvedArtifact } from '../../shared/types/resolution.ts';
import { createFileOutput } from '../../shared/utils/outputs.ts';
import { renderMcpJson } from '../claude/mcp-json.ts';
import { convertPermissions } from './cli-permissions.ts';
import { renderRuleMdc } from './rule-mdc.ts';
import { renderCursorSubagent } from './subagent-md.ts';

const RULES_DIR = '.cursor/rules/tunestra';
const SUBAGENTS_DIR = '.cursor/agents';
const MCP_FILE = '.cursor/mcp.json';
const MCP_SOURCE = 'the mcp/ folders of tunestra.yaml and its presets';
const CLI_FILE = '.cursor/cli.json';
const CLI_SOURCE = 'permissions in tunestra.yaml and its presets';
const LOCAL_RULE_FILE = `${RULES_DIR}/00-personal-setup.mdc`;
const LOCAL_SOURCE = `${LOCAL_CONFIG} and ${LOCAL_DIR}/`;

const CLI_NOTE =
  'Cursor reads permissions from .cursor/cli.json only in the CLI. In the editor, set the allowlist in the settings of the agent.';

/**
 * Cursor reads AGENTS.md and the skills in `.agents/skills` by itself, but it does not
 * follow the links in AGENTS.md, so rules are copied to `.cursor/rules` as `.mdc` files that
 * apply in every chat. Commands become skills that run only on `/<name>`. MCP servers go to
 * `.cursor/mcp.json`, subagents to `.cursor/agents`, and permissions to the CLI config.
 */
export const cursorAdapter: AgentAdapter = {
  agent: Agent.Cursor,
  plan: planCursor,
  planLocal: planCursorLocal,
};

function planCursor(context: AgentPlanContext): SetupPlan {
  const { resolution, ruleFiles } = context;
  const projectDir = resolution.chain.project.dir;
  const notes: Array<string> = [];
  const ruleCopies = ruleFiles.map((ruleFile, index) => {
    const description = resolution.rules[index]?.artifact.description;

    return copyRule(ruleFile, description);
  });
  const commandSkills = selectCommandSkills('Cursor', resolution.commands);
  const commandFiles = commandSkills.commands.map((command) =>
    planCommandSkill(projectDir, command),
  );
  const subagentFiles = resolution.subagents.map((subagent) => planSubagent(projectDir, subagent));
  const outputs: Array<Output> = [...ruleCopies, ...commandFiles, ...subagentFiles];
  // Cursor skips rules in an ignored directory, so `.gitignore` names the files in it.
  const ignoredPaths = [`${RULES_DIR}/*`];

  notes.push(...commandSkills.notes);

  const hasSubagents = subagentFiles.length > 0;

  if (hasSubagents) {
    ignoredPaths.push(`${SUBAGENTS_DIR}/`);
  }

  const effortSubagents = resolution.subagents
    .filter((subagent) => typeof subagent.artifact.effort === 'string')
    .map((subagent) => subagent.artifact.key);

  if (effortSubagents.length > 0) {
    const names = effortSubagents.join(', ');

    notes.push(`Cursor has no reasoning effort for subagents: it skips effort for ${names}.`);
  }

  const hasMcpServers = resolution.mcp.length > 0;

  if (hasMcpServers) {
    const mcpJson = renderMcpJson(resolution.mcp);
    const mcpFile = createFileOutput(MCP_FILE, mcpJson, MCP_SOURCE);

    outputs.push(mcpFile);
    ignoredPaths.push(MCP_FILE);
  }

  const hasEnv = resolution.env.length > 0;

  if (hasEnv) {
    notes.push(
      'Cursor skips env: it has no environment variables in project settings. Set them in your shell.',
    );
  }

  const cliPlan = planCliFile(resolution.permissions);

  notes.push(...cliPlan.notes);

  if (typeof cliPlan.file === 'object') {
    outputs.push(cliPlan.file);
    ignoredPaths.push(CLI_FILE);
  }

  return {
    outputs,
    ignoredPaths,
    protectedPaths: [],
    notes,
    merges: [],
  };
}

/** Cursor has no file like CLAUDE.local.md, so the personal setup is one more rule. */
function planCursorLocal(context: LocalPlanContext): LocalPlan {
  const changes = renderLocalChanges(context.shared, context.local);
  const content = renderRuleMdc('Personal setup of this developer', changes);
  const file = createFileOutput(LOCAL_RULE_FILE, content, LOCAL_SOURCE);

  return {
    outputs: [file],
    ignoredPaths: [],
    merges: [],
  };
}

type CliPlan = {
  file: OutputFile | undefined;
  notes: ReadonlyArray<string>;
};

function planCliFile(permissions: ReadonlyArray<ResolvedArtifact<PermissionRule>>): CliPlan {
  const converted = convertPermissions(permissions);
  const notes: Array<string> = [];

  if (converted.askRules.length > 0) {
    const rules = converted.askRules.join(', ');

    notes.push(`Cursor skips ask rules: ${rules}. The Cursor CLI has only allow and deny lists.`);
  }

  if (converted.skippedRules.length > 0) {
    const rules = converted.skippedRules.join(', ');

    notes.push(`Cursor skips permission rules that it cannot express: ${rules}.`);
  }

  const lists: Record<string, ReadonlyArray<string>> = {};

  if (converted.allow.length > 0) {
    lists.allow = converted.allow;
  }

  if (converted.deny.length > 0) {
    lists.deny = converted.deny;
  }

  const hasRules = Object.keys(lists).length > 0;

  if (hasRules === false) {
    return {
      file: undefined,
      notes,
    };
  }

  notes.push(CLI_NOTE);

  const content = {
    permissions: lists,
  };
  const json = JSON.stringify(content, null, 2);
  const file = createFileOutput(CLI_FILE, `${json}\n`, CLI_SOURCE);
  const ownership = {
    keys: ['permissions'],
    otherKeysTarget: '~/.cursor/cli-config.json',
  };

  return {
    file: {
      ...file,
      ownership,
    },
    notes,
  };
}

function copyRule(ruleFile: OutputFile, description: string | undefined): OutputFile {
  const fileName = posix.basename(ruleFile.path, '.md');
  const path = `${RULES_DIR}/${fileName}.mdc`;
  const content = renderRuleMdc(description, ruleFile.content);

  return createFileOutput(path, content, ruleFile.source);
}

function planSubagent(projectDir: string, subagent: ResolvedArtifact<Subagent>): OutputFile {
  const path = `${SUBAGENTS_DIR}/${subagent.artifact.key}.md`;
  const content = renderCursorSubagent(subagent.artifact);
  const source = describeArtifactSource(projectDir, subagent.origin, subagent.artifact.source);

  return createFileOutput(path, content, source);
}

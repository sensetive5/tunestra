import type { Artifacts } from '../../shared/types/preset.ts';
import { buildResultsError, isEveryFulfilled } from '../../shared/utils/settled.ts';
import { loadCommands } from './commands.ts';
import { loadMcpServers } from './mcp-servers.ts';
import { loadRules } from './rules.ts';
import { loadSkills } from './skills.ts';

/** Loads every kind of artifact at the same time and reports the problems of all of them. */
export async function loadArtifacts(dir: string, presetName: string): Promise<Artifacts> {
  const rulesLoading = loadRules(dir, presetName);
  const skillsLoading = loadSkills(dir);
  const commandsLoading = loadCommands(dir);
  const mcpLoading = loadMcpServers(dir);

  const results = await Promise.allSettled([
    rulesLoading,
    skillsLoading,
    commandsLoading,
    mcpLoading,
  ]);

  if (isEveryFulfilled(results) === false) {
    throw buildResultsError(results);
  }

  const [rulesResult, skillsResult, commandsResult, mcpResult] = results;

  return {
    rules: rulesResult.value,
    skills: skillsResult.value,
    commands: commandsResult.value,
    mcp: mcpResult.value,
  };
}

import { GENERATED_NOTICE } from '../shared/constants/output.ts';
import type { Resolution } from '../shared/types/resolution.ts';
import {
  CHANGING_SECTION,
  renderCommands,
  renderHierarchy,
  renderMcpServers,
  renderRules,
  renderSkills,
} from './index-sections.ts';

/**
 * AGENTS.md: an index of the setup, not the rules themselves. It lists the levels, every
 * rule, skill, command and MCP server, where each comes from and where its file is.
 */
export function renderAgentsIndex(resolution: Resolution): string {
  const title = `# AI agent context: ${resolution.chain.project.name}`;
  const hierarchy = renderHierarchy(resolution.chain);
  const sections = [GENERATED_NOTICE, title, hierarchy];

  const hasRules = resolution.rules.length > 0;
  const hasSkills = resolution.skills.length > 0;
  const hasCommands = resolution.commands.length > 0;
  const hasMcpServers = resolution.mcp.length > 0;

  if (hasRules) {
    const rules = renderRules(resolution.rules);

    sections.push(rules);
  }

  if (hasSkills) {
    const skills = renderSkills(resolution.skills);

    sections.push(skills);
  }

  if (hasCommands) {
    const commands = renderCommands(resolution.commands);

    sections.push(commands);
  }

  if (hasMcpServers) {
    const servers = renderMcpServers(resolution.mcp);

    sections.push(servers);
  }

  sections.push(CHANGING_SECTION);

  return `${sections.join('\n\n')}\n`;
}

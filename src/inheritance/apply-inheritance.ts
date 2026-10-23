import { ArtifactKind } from '../shared/constants/artifacts.ts';
import { createProblemsError } from '../shared/errors/create-problems-error.ts';
import type { Chain } from '../shared/types/chain.ts';
import type { Resolution } from '../shared/types/resolution.ts';
import { inheritArtifacts } from './inherit-artifacts.ts';
import { patchMcpServers } from './patch-mcp-servers.ts';

/** Resolves every kind of artifact along the chain and reports all problems together. */
export function applyInheritance(chain: Chain): Resolution {
  const rules = inheritArtifacts(chain.levels, ArtifactKind.Rules, (level) => level.rules);
  const skills = inheritArtifacts(chain.levels, ArtifactKind.Skills, (level) => level.skills);
  const commands = inheritArtifacts(chain.levels, ArtifactKind.Commands, (level) => level.commands);
  const mcp = inheritArtifacts(
    chain.levels,
    ArtifactKind.Mcp,
    (level) => level.mcp,
    patchMcpServers,
  );

  const problems = [...rules.problems, ...skills.problems, ...commands.problems, ...mcp.problems];

  if (problems.length > 0) {
    throw createProblemsError(problems);
  }

  return {
    chain,
    rules: rules.artifacts,
    skills: skills.artifacts,
    commands: commands.artifacts,
    mcp: mcp.artifacts,
  };
}

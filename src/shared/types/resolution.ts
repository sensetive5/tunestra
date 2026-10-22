import type { Level } from '../constants/levels.ts';
import type { Chain } from './chain.ts';
import type { Command, McpServer, Rule, Skill } from './preset.ts';

/** The level that an artifact comes from. */
export type Origin = {
  name: string;
  level: Level;
  /** Directory of the manifest. */
  dir: string;
  /** Directory with the level's artifacts; `source` paths of artifacts are relative to it. */
  artifactsDir: string;
};

/**
 * An artifact after inheritance. `overrides` are the more general levels whose artifact
 * with the same key it replaced; `patchedBy` are the more specific levels that patched it.
 */
export type ResolvedArtifact<TArtifact> = {
  artifact: TArtifact;
  origin: Origin;
  overrides: ReadonlyArray<Origin>;
  patchedBy: ReadonlyArray<Origin>;
};

/** Every artifact after inheritance, from specific to general. */
export type Resolution = {
  chain: Chain;
  rules: ReadonlyArray<ResolvedArtifact<Rule>>;
  skills: ReadonlyArray<ResolvedArtifact<Skill>>;
  commands: ReadonlyArray<ResolvedArtifact<Command>>;
  mcp: ReadonlyArray<ResolvedArtifact<McpServer>>;
};

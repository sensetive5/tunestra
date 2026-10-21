import type { ArtifactKind } from '../shared/constants/artifacts.ts';
import type { Preset } from '../shared/types/preset.ts';
import type { Origin, ResolvedArtifact } from '../shared/types/resolution.ts';

type KeyedArtifact = {
  key: string;
};

/** Changes the inherited artifacts of a level before its own artifacts are added. */
export type PatchArtifacts<TArtifact> = (
  inherited: Map<string, ResolvedArtifact<TArtifact>>,
  level: Preset,
) => ReadonlyArray<string>;

export type Inheritance<TArtifact> = {
  /** From specific to general, in the order of the files inside each level. */
  artifacts: ReadonlyArray<ResolvedArtifact<TArtifact>>;
  problems: ReadonlyArray<string>;
};

/**
 * Walks the levels from general to specific. On each level: drop the excluded keys, patch
 * the inherited artifacts, then add the level's own artifacts; the same key replaces the
 * inherited one.
 */
export function inheritArtifacts<TArtifact extends KeyedArtifact>(
  levels: ReadonlyArray<Preset>,
  kind: ArtifactKind,
  selectArtifacts: (level: Preset) => ReadonlyArray<TArtifact>,
  patchArtifacts: PatchArtifacts<TArtifact> = skipPatches,
): Inheritance<TArtifact> {
  const inherited = new Map<string, ResolvedArtifact<TArtifact>>();
  const problems: Array<string> = [];

  for (const level of levels) {
    const excludeProblems = excludeArtifacts(inherited, level, kind);
    const patchProblems = patchArtifacts(inherited, level);
    const ownArtifacts = selectArtifacts(level);
    const origin = createOrigin(level);

    problems.push(...excludeProblems, ...patchProblems);

    for (const artifact of ownArtifacts) {
      addArtifact(inherited, artifact, origin);
    }
  }

  const artifacts = orderFromSpecific(levels, inherited, selectArtifacts);

  return {
    artifacts,
    problems,
  };
}

export function createOrigin(level: Preset): Origin {
  return {
    name: level.name,
    level: level.level,
  };
}

function skipPatches(): ReadonlyArray<string> {
  return [];
}

function excludeArtifacts<TArtifact>(
  inherited: Map<string, ResolvedArtifact<TArtifact>>,
  level: Preset,
  kind: ArtifactKind,
): ReadonlyArray<string> {
  const keys = level.exclude[kind] ?? [];
  const problems: Array<string> = [];

  for (const key of keys) {
    const isInherited = inherited.delete(key);

    if (isInherited === false) {
      problems.push(
        `${level.name}: exclude.${kind} lists "${key}", but no more general level has it`,
      );
    }
  }

  return problems;
}

function addArtifact<TArtifact extends KeyedArtifact>(
  inherited: Map<string, ResolvedArtifact<TArtifact>>,
  artifact: TArtifact,
  origin: Origin,
): void {
  const previous = inherited.get(artifact.key);
  const overrides = collectOverrides(previous);

  inherited.set(artifact.key, {
    artifact,
    origin,
    overrides,
    patchedBy: [],
  });
}

function collectOverrides<TArtifact>(
  previous: ResolvedArtifact<TArtifact> | undefined,
): ReadonlyArray<Origin> {
  if (previous === undefined) {
    return [];
  }

  return [...previous.overrides, previous.origin];
}

/** Specific levels first, so that agents read the rules that win first. */
function orderFromSpecific<TArtifact extends KeyedArtifact>(
  levels: ReadonlyArray<Preset>,
  inherited: ReadonlyMap<string, ResolvedArtifact<TArtifact>>,
  selectArtifacts: (level: Preset) => ReadonlyArray<TArtifact>,
): ReadonlyArray<ResolvedArtifact<TArtifact>> {
  const ordered: Array<ResolvedArtifact<TArtifact>> = [];
  const specificFirst = levels.toReversed();

  for (const level of specificFirst) {
    const ownArtifacts = selectArtifacts(level);

    for (const artifact of ownArtifacts) {
      const resolved = inherited.get(artifact.key);
      const isFromThisLevel = resolved?.origin.name === level.name;

      if (isFromThisLevel) {
        ordered.push(resolved);
      }
    }
  }

  return ordered;
}

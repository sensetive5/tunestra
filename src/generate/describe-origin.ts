import type { Origin, ResolvedArtifact } from '../shared/types/resolution.ts';

/** For example `team, overrides base` or `base, patched by team`. */
export function describeOrigin<TArtifact>(resolved: ResolvedArtifact<TArtifact>): string {
  const parts: Array<string> = [resolved.origin.level];
  const hasOverrides = resolved.overrides.length > 0;
  const isPatched = resolved.patchedBy.length > 0;

  if (hasOverrides) {
    const names = joinNames(resolved.overrides);

    parts.push(`overrides ${names}`);
  }

  if (isPatched) {
    const names = joinNames(resolved.patchedBy);

    parts.push(`patched by ${names}`);
  }

  return parts.join(', ');
}

export function joinNames(origins: ReadonlyArray<Origin>): string {
  const names = origins.map((origin) => origin.name);

  return names.join(', ');
}

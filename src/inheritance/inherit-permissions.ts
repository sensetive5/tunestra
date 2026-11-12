import { PermissionDecision } from '../shared/constants/permissions.ts';
import type { PermissionRule, Preset } from '../shared/types/preset.ts';
import type { ResolvedArtifact } from '../shared/types/resolution.ts';
import { createOrigin, type Inheritance } from './inherit-artifacts.ts';

type ResolvedRule = ResolvedArtifact<PermissionRule>;

/**
 * Permission lists are joined along the chain: every level adds its rules. A more specific
 * level can remove inherited `allow` and `ask` rules with `exclude.permissions`, but not
 * `deny` rules, so that a general level keeps a floor of what is never allowed.
 */
export function inheritPermissions(levels: ReadonlyArray<Preset>): Inheritance<PermissionRule> {
  const inherited = new Map<string, ResolvedRule>();
  const problems: Array<string> = [];

  for (const level of levels) {
    const excludeProblems = excludeRules(inherited, level);
    const origin = createOrigin(level);

    problems.push(...excludeProblems);

    for (const rule of level.permissions) {
      const id = buildRuleId(rule);
      const previous = inherited.get(id);
      const overrides = previous === undefined ? [] : [...previous.overrides, previous.origin];

      inherited.set(id, {
        artifact: rule,
        origin,
        overrides,
        patchedBy: [],
      });
    }
  }

  const artifacts = [...inherited.values()];

  return {
    artifacts,
    problems,
  };
}

/** The same rule can be in two lists, for example in `allow` on one level and `deny` on another. */
function buildRuleId(rule: PermissionRule): string {
  return `${rule.decision} ${rule.key}`;
}

function excludeRules(inherited: Map<string, ResolvedRule>, level: Preset): ReadonlyArray<string> {
  const keys = level.exclude.permissions ?? [];
  const problems: Array<string> = [];

  for (const key of keys) {
    const matches = [...inherited.values()].filter((resolved) => resolved.artifact.key === key);
    const deny = matches.find((resolved) => resolved.artifact.decision === PermissionDecision.Deny);

    if (typeof deny === 'object') {
      problems.push(
        `${level.name}: exclude.permissions lists "${key}", but it is a deny rule of ${deny.origin.name}, and a deny rule cannot be removed`,
      );

      continue;
    }

    if (matches.length === 0) {
      problems.push(
        `${level.name}: exclude.permissions lists "${key}", but no more general level has it`,
      );

      continue;
    }

    for (const match of matches) {
      const id = buildRuleId(match.artifact);

      inherited.delete(id);
    }
  }

  return problems;
}

import { join } from 'node:path';
import { buildInstructionsKey } from '../presets/artifacts/rules.ts';
import { LEVEL_RANK } from '../shared/constants/levels.ts';
import { GENERATED_MARKER } from '../shared/constants/output.ts';
import type { Rule } from '../shared/types/preset.ts';
import type { ResolvedArtifact } from '../shared/types/resolution.ts';
import { relativePosix } from '../shared/utils/paths.ts';
import { joinNames } from './describe-origin.ts';

/**
 * `<rank>-<level>-<key>.md`, so that a plain sort puts specific rules first. Level
 * instructions become `instructions`, with the preset name when it differs from the level.
 */
export function buildRuleFileName(rule: ResolvedArtifact<Rule>): string {
  const rank = LEVEL_RANK[rule.origin.level];
  const slug = buildRuleSlug(rule);

  return `${rank}-${rule.origin.level}-${slug}.md`;
}

/** The rule text with a header that tells where it comes from and what it overrides. */
export function renderRuleFile(rule: ResolvedArtifact<Rule>): string {
  const sourceFile = join(rule.origin.artifactsDir, rule.artifact.source);
  const sourcePath = relativePosix(rule.origin.dir, sourceFile);
  const levelLine = renderLevelLine(rule);

  return [
    `${GENERATED_MARKER} from ${rule.origin.name}:${sourcePath}. Do not edit. -->`,
    levelLine,
    '',
    rule.artifact.body,
  ].join('\n');
}

function buildRuleSlug(rule: ResolvedArtifact<Rule>): string {
  const instructionsKey = buildInstructionsKey(rule.origin.name);
  const isInstructions = rule.artifact.key === instructionsKey;
  const isNamedAsLevel = rule.origin.name === rule.origin.level;

  if (isInstructions === false) {
    return rule.artifact.key;
  }

  if (isNamedAsLevel) {
    return 'instructions';
  }

  return `instructions-${rule.origin.name}`;
}

/** For example `> Level: team, preset: team. Overrides: base.` */
function renderLevelLine(rule: ResolvedArtifact<Rule>): string {
  const line = `> Level: ${rule.origin.level}, preset: ${rule.origin.name}.`;
  const hasOverrides = rule.overrides.length > 0;

  if (hasOverrides) {
    const names = joinNames(rule.overrides);

    return `${line} Overrides: ${names}.`;
  }

  return line;
}

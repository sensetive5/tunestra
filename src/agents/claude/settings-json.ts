import { PermissionDecision } from '../../shared/constants/permissions.ts';
import type { SettingsEntries } from '../../shared/types/output.ts';
import type { EnvVariable, PermissionRule } from '../../shared/types/preset.ts';
import type { ResolvedArtifact } from '../../shared/types/resolution.ts';
import { buildEnvMap } from '../../shared/utils/env.ts';

const SETTINGS_SCHEMA = 'https://json.schemastore.org/claude-code-settings.json';

const DECISIONS: ReadonlyArray<PermissionDecision> = Object.values(PermissionDecision);

/** The keys that tunestra writes; a file with only these keys is a generated one. */
export const SETTINGS_KEYS: ReadonlyArray<string> = ['$schema', 'env', 'permissions'];

export type ClaudeSettings = {
  env: ReadonlyArray<ResolvedArtifact<EnvVariable>>;
  permissions: ReadonlyArray<ResolvedArtifact<PermissionRule>>;
};

/** `.claude/settings.json` with sorted keys and lists, so that its diff stays small. */
export function renderSettingsJson(settings: ClaudeSettings): string {
  const content: Record<string, unknown> = {
    $schema: SETTINGS_SCHEMA,
  };
  const hasEnv = settings.env.length > 0;
  const hasPermissions = settings.permissions.length > 0;

  if (hasEnv) {
    content.env = buildEnvMap(settings.env);
  }

  if (hasPermissions) {
    content.permissions = buildPermissionLists(settings.permissions);
  }

  const json = JSON.stringify(content, null, 2);

  return `${json}\n`;
}

/** Every list, empty ones included, for entries that setup adds to a file of people. */
export function buildSettingsEntries(
  env: ReadonlyArray<ResolvedArtifact<EnvVariable>>,
  permissions: ReadonlyArray<ResolvedArtifact<PermissionRule>>,
): SettingsEntries {
  const envMap = buildEnvMap(env);
  const lists = buildPermissionLists(permissions);
  const permissionLists = {
    [PermissionDecision.Allow]: lists[PermissionDecision.Allow] ?? [],
    [PermissionDecision.Ask]: lists[PermissionDecision.Ask] ?? [],
    [PermissionDecision.Deny]: lists[PermissionDecision.Deny] ?? [],
  };

  return {
    env: envMap,
    permissions: permissionLists,
  };
}

/** Only the lists that have rules; a rule repeated on several levels is written once. */
function buildPermissionLists(
  permissions: ReadonlyArray<ResolvedArtifact<PermissionRule>>,
): Record<string, ReadonlyArray<string>> {
  const lists: Record<string, ReadonlyArray<string>> = {};

  for (const decision of DECISIONS) {
    const rules = permissions.filter((resolved) => resolved.artifact.decision === decision);
    const keys = rules.map((resolved) => resolved.artifact.key);
    const uniqueKeys = new Set(keys);
    const sortedKeys = [...uniqueKeys].toSorted();

    if (sortedKeys.length > 0) {
      lists[decision] = sortedKeys;
    }
  }

  return lists;
}

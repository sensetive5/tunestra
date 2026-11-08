import { PermissionDecision } from '../shared/constants/permissions.ts';
import type { PermissionRule, Permissions } from '../shared/types/preset.ts';
import { relativePosix } from '../shared/utils/paths.ts';

const DECISIONS: ReadonlyArray<PermissionDecision> = Object.values(PermissionDecision);

/** The `permissions` lists of a manifest as one list of rules, in the order of the file. */
export function createPermissionRules(
  permissions: Permissions,
  manifestPath: string,
  artifactsDir: string,
): ReadonlyArray<PermissionRule> {
  const source = relativePosix(artifactsDir, manifestPath);
  const rules: Array<PermissionRule> = [];

  for (const decision of DECISIONS) {
    const keys = permissions[decision] ?? [];

    for (const key of keys) {
      rules.push({
        key,
        decision,
        source,
      });
    }
  }

  return rules;
}

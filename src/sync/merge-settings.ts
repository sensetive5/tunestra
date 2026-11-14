import { PermissionDecision } from '../shared/constants/permissions.ts';
import type { SettingsEntries } from '../shared/types/output.ts';
import { isKeyValueMap } from '../shared/utils/guards.ts';

const DECISIONS: ReadonlyArray<PermissionDecision> = Object.values(PermissionDecision);

/**
 * The settings of people with the entries of setup: the entries from the last setup are
 * taken out, the new ones are added. A variable that someone changed after setup wrote it
 * is theirs now and stays. Other keys keep their order.
 */
export function mergeSettings(
  current: Readonly<Record<string, unknown>>,
  previous: SettingsEntries | undefined,
  next: SettingsEntries | undefined,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    ...current,
  };
  const env = mergeEnv(current.env, previous, next);
  const permissions = mergePermissions(current.permissions, previous, next);

  setOrDelete(result, 'env', env);
  setOrDelete(result, 'permissions', permissions);

  return result;
}

function mergeEnv(
  current: unknown,
  previous: SettingsEntries | undefined,
  next: SettingsEntries | undefined,
): Record<string, unknown> {
  const env: Record<string, unknown> = isKeyValueMap(current) ? { ...current } : {};
  const previousEnv = previous?.env ?? {};
  const previousEntries = Object.entries(previousEnv);

  for (const [name, value] of previousEntries) {
    const isUnchanged = env[name] === value;

    if (isUnchanged) {
      delete env[name];
    }
  }

  const nextEnv = next?.env ?? {};

  return {
    ...env,
    ...nextEnv,
  };
}

function mergePermissions(
  current: unknown,
  previous: SettingsEntries | undefined,
  next: SettingsEntries | undefined,
): Record<string, unknown> {
  const permissions: Record<string, unknown> = isKeyValueMap(current) ? { ...current } : {};

  for (const decision of DECISIONS) {
    const list = permissions[decision];
    const rules = Array.isArray(list) ? list : [];
    const previousRules = previous?.permissions[decision] ?? [];
    const nextRules = next?.permissions[decision] ?? [];
    const keptRules = rules.filter((rule) => previousRules.includes(rule) === false);
    const addedRules = nextRules.filter((rule) => keptRules.includes(rule) === false);
    const merged = [...keptRules, ...addedRules];

    setOrDelete(permissions, decision, merged);
  }

  return permissions;
}

/** An empty list or object is left out, as if nobody had written it. */
function setOrDelete(target: Record<string, unknown>, key: string, value: unknown): void {
  const isEmptyList = Array.isArray(value) && value.length === 0;
  const isEmptyRecord = isKeyValueMap(value) && Object.keys(value).length === 0;

  if (isEmptyList || isEmptyRecord) {
    delete target[key];

    return;
  }

  target[key] = value;
}

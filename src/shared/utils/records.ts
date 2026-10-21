/** Merges two string maps; keys of `patch` win. Missing on both sides stays missing. */
export function mergeRecords(
  base: Readonly<Record<string, string>> | undefined,
  patch: Readonly<Record<string, string>> | undefined,
): Record<string, string> | undefined {
  if (base === undefined && patch === undefined) {
    return undefined;
  }

  return {
    ...base,
    ...patch,
  };
}

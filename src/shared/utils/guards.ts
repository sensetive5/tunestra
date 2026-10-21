export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isKeyValueMap(value: unknown): value is Record<string, unknown> {
  if (value === null) {
    return false;
  }

  if (Array.isArray(value)) {
    return false;
  }

  return typeof value === 'object';
}

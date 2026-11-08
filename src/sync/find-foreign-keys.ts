import { readFile } from 'node:fs/promises';
import { isKeyValueMap } from '../shared/utils/guards.ts';

/**
 * The top-level keys of a JSON file that are not in `ownedKeys`. A file that is not a JSON
 * object has no keys that tunestra could own, so the result is `undefined`.
 */
export async function findForeignKeys(
  path: string,
  ownedKeys: ReadonlyArray<string>,
): Promise<ReadonlyArray<string> | undefined> {
  const text = await readFile(path, 'utf8');
  const data = parseJson(text);

  if (isKeyValueMap(data)) {
    const keys = Object.keys(data);

    return keys.filter((key) => ownedKeys.includes(key) === false);
  }

  return undefined;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return undefined;
    }

    throw error;
  }
}

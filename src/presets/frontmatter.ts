import { parse } from 'yaml';
import { TunestraError } from '../errors.ts';

/**
 * A YAML block between two `---` lines at the very start of the file.
 * Group 1 is the YAML; it is missing when the block is empty.
 *
 * Matches:        "---\ndescription: Hi\n---\n# Title"  → group 1 = "description: Hi"
 * Matches:        "---\n---\nText"                       → group 1 = undefined
 * Does not match: "# Title\n---\nkey: value\n---"         (not at the start of the file)
 */
const FRONTMATTER_PATTERN = /^---\r?\n(?:([\s\S]*?)\r?\n)?---(?:\r?\n|$)/;

export type Frontmatter = {
  data: Record<string, unknown>;
  body: string;
};

/** Splits a markdown file into YAML frontmatter and body. A file without frontmatter has empty data. */
export function parseFrontmatter(text: string, file: string): Frontmatter {
  const match = FRONTMATTER_PATTERN.exec(text);
  if (match === null) {
    return { data: {}, body: text };
  }

  const data = parseYaml(match[1] ?? '', file);
  const isValid = isKeyValueMap(data);
  if (isValid) {
    return { data, body: text.slice(match[0].length) };
  }

  throw new TunestraError(`Invalid frontmatter in ${file}: expected key-value pairs`);
}

function parseYaml(text: string, file: string): unknown {
  try {
    return parse(text) ?? {};
  } catch (error) {
    throw new TunestraError(`Invalid frontmatter in ${file}: ${(error as Error).message}`);
  }
}

/** True for `{ a: 1 }`; false for `[1, 2]`, `null`, `'text'` and `42`. */
function isKeyValueMap(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && Array.isArray(value) === false;
}

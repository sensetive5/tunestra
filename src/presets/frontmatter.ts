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
const FRONTMATTER = /^---\r?\n(?:([\s\S]*?)\r?\n)?---(?:\r?\n|$)/;

export type Frontmatter = {
  data: Record<string, unknown>;
  body: string;
};

/** Splits a markdown file into YAML frontmatter and body. A file without frontmatter has empty data. */
export function parseFrontmatter(text: string, file: string): Frontmatter {
  const match = FRONTMATTER.exec(text);
  if (!match) {
    return { data: {}, body: text };
  }

  let data: unknown;
  try {
    data = parse(match[1] ?? '') ?? {};
  } catch (error) {
    throw new TunestraError(`Invalid frontmatter in ${file}: ${(error as Error).message}`);
  }
  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new TunestraError(`Invalid frontmatter in ${file}: expected key-value pairs`);
  }

  return { data: data as Record<string, unknown>, body: text.slice(match[0].length) };
}

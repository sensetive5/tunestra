import { TunestraError } from '../shared/errors/tunestra-error.ts';
import type { Frontmatter } from '../shared/types/frontmatter.ts';
import { isKeyValueMap } from '../shared/utils/guards.ts';
import { parseYaml } from '../shared/utils/yaml.ts';

/**
 * A YAML block between two `---` lines at the very start of the file.
 * Group 1 is the YAML; it is missing when the block is empty.
 *
 * Matches:        "---\ndescription: Hi\n---\n# Title"  → group 1 = "description: Hi"
 * Matches:        "---\n---\nText"                       → group 1 = undefined
 * Does not match: "# Title\n---\nkey: value\n---"         (not at the start of the file)
 */
const FRONTMATTER_PATTERN = /^---\r?\n(?:([\s\S]*?)\r?\n)?---(?:\r?\n|$)/;

/** Splits a markdown file into YAML frontmatter and body. A file without frontmatter has empty data. */
export function parseFrontmatter(text: string, file: string): Frontmatter {
  const match = FRONTMATTER_PATTERN.exec(text);

  if (match === null) {
    return {
      data: {},
      body: text,
    };
  }

  const yaml = match.at(1) ?? '';
  const data = parseYaml(yaml, `frontmatter in ${file}`);

  if (isKeyValueMap(data)) {
    const body = text.slice(match[0].length);

    return {
      data,
      body,
    };
  }

  throw new TunestraError(`Invalid frontmatter in ${file}: expected key-value pairs`);
}

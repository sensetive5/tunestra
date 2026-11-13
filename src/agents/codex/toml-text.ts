import { stringify } from 'smol-toml';

/** Starts and ends a multi-line literal string, where TOML escapes nothing. */
const LITERAL_DELIMITER = "'''";

/**
 * Control characters that a TOML literal string cannot hold. Tab and line feed are allowed;
 * a carriage return is in the list, because only `\r\n` would be valid.
 *
 * Matches:        "\u0000", "\r", "\u001B" (escape), "\u007F" (delete)
 * Does not match: "\t", "\n", "é", "→"
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: the pattern looks for control characters on purpose.
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000B-\u001F\u007F]/;

/**
 * A key with a long text, like `developer_instructions`. The text is a literal string, so
 * that people can read it; a text that a literal string cannot hold is escaped.
 */
export function renderTomlText(key: string, text: string): string {
  const hasDelimiter = text.includes(LITERAL_DELIMITER);
  const hasControlCharacter = CONTROL_CHARACTER_PATTERN.test(text);

  if (hasDelimiter || hasControlCharacter) {
    const content = {
      [key]: text,
    };

    return stringify(content);
  }

  // A line break right after the opening quotes is not part of the string.
  return `${key} = ${LITERAL_DELIMITER}\n${text}${LITERAL_DELIMITER}`;
}

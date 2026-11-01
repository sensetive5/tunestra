import { stringify } from 'smol-toml';
import { GENERATED_HASH_NOTICE } from '../../shared/constants/output.ts';
import type { McpConfig, McpServer } from '../../shared/types/preset.ts';
import type { ResolvedArtifact } from '../../shared/types/resolution.ts';

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

/** An MCP server in the shape Codex reads from `[mcp_servers.<key>]`. */
type CodexMcpServer = Omit<McpConfig, 'type' | 'headers'> & {
  http_headers?: Record<string, string>;
};

/**
 * `.codex/config.toml`: the rules as `developer_instructions`, which Codex adds to every
 * session, and the MCP servers. The rules are a literal string, so that people can read them.
 */
export function renderConfigToml(
  instructions: string | undefined,
  servers: ReadonlyArray<ResolvedArtifact<McpServer>>,
): string {
  const parts = [GENERATED_HASH_NOTICE];

  if (typeof instructions === 'string') {
    const line = renderInstructions(instructions);

    parts.push(line);
  }

  const hasServers = servers.length > 0;

  if (hasServers) {
    const entries = servers.map((server) => {
      const config = convertMcpConfig(server.artifact.config);

      return [server.artifact.key, config];
    });
    const mcpServers = Object.fromEntries(entries);
    const content = {
      mcp_servers: mcpServers,
    };
    const tables = stringify(content).trimEnd();

    parts.push(tables);
  }

  return `${parts.join('\n\n')}\n`;
}

function renderInstructions(text: string): string {
  const hasDelimiter = text.includes(LITERAL_DELIMITER);
  const hasControlCharacter = CONTROL_CHARACTER_PATTERN.test(text);

  if (hasDelimiter || hasControlCharacter) {
    const content = {
      developer_instructions: text,
    };

    return stringify(content);
  }

  // A line break right after the opening quotes is not part of the string.
  return `developer_instructions = ${LITERAL_DELIMITER}\n${text}${LITERAL_DELIMITER}`;
}

/** Codex picks the transport by `command` or `url` and has no `type`. */
function convertMcpConfig(config: McpConfig): CodexMcpServer {
  const { type: _type, headers, ...server } = config;

  if (headers === undefined) {
    return server;
  }

  return {
    ...server,
    http_headers: headers,
  };
}

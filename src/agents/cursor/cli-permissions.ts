import { PermissionDecision } from '../../shared/constants/permissions.ts';
import type { PermissionRule } from '../../shared/types/preset.ts';
import type { ResolvedArtifact } from '../../shared/types/resolution.ts';

/**
 * A rule of Claude Code: a tool name and an optional specifier in parentheses.
 *
 * Matches:        "Bash", "Bash(git push *)", "Read(./.env)", "mcp__docs__search"
 * Does not match: "Bash(git push" (no closing parenthesis), "(git)" (no tool)
 */
const RULE_PATTERN = /^(?<tool>[A-Za-z][\w*-]*)(?:\((?<specifier>.+)\))?$/;

/**
 * Shell syntax that a rule of the Cursor CLI cannot express: it matches the first word of a
 * command and a glob for the rest.
 *
 * Matches:        "npm test && rm", "echo $HOME", "ls > out", "say 'hi'"
 * Does not match: "npm test", "git push *", "rm -rf"
 */
const SHELL_SYNTAX_PATTERN = /["'`$\\|&;<>(){}[\]~]/;

/**
 * Glob characters, which may stand only in the arguments.
 *
 * Matches:        "git*", "?s"
 * Does not match: "git", "npm"
 */
const GLOB_PATTERN = /[*?]/;

const WHITESPACE_PATTERN = /\s+/;

/** A trailing ` *` or the older `:*` means "this command with any arguments". */
const ANY_ARGUMENTS_SUFFIXES: ReadonlyArray<string> = [' *', ':*'];

const MCP_PREFIX = 'mcp__';
const MCP_SEPARATOR = '__';
const DOMAIN_PREFIX = 'domain:';
const HOME_PREFIX = '~';
const ABSOLUTE_PREFIX = '//';

/** Tools of Claude Code that write files; the Cursor CLI has one `Write` for them. */
const WRITE_TOOLS: ReadonlyArray<string> = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'];

export type CursorPermissions = {
  allow: ReadonlyArray<string>;
  deny: ReadonlyArray<string>;
  /** `ask` rules: the Cursor CLI has only `allow` and `deny`. */
  askRules: ReadonlyArray<string>;
  /** Rules that the Cursor CLI cannot express. */
  skippedRules: ReadonlyArray<string>;
};

/** Permission rules in the syntax of the Cursor CLI, sorted and without repeats. */
export function convertPermissions(
  permissions: ReadonlyArray<ResolvedArtifact<PermissionRule>>,
): CursorPermissions {
  const allow = new Set<string>();
  const deny = new Set<string>();
  const askRules: Array<string> = [];
  const skippedRules: Array<string> = [];

  for (const resolved of permissions) {
    const { key, decision } = resolved.artifact;

    if (decision === PermissionDecision.Ask) {
      askRules.push(key);

      continue;
    }

    const rule = convertRule(key);

    if (rule === undefined) {
      skippedRules.push(key);

      continue;
    }

    const list = decision === PermissionDecision.Allow ? allow : deny;

    list.add(rule);
  }

  return {
    allow: [...allow].toSorted(),
    deny: [...deny].toSorted(),
    askRules,
    skippedRules,
  };
}

/** One rule of Claude Code as a rule of the Cursor CLI, or `undefined` when it cannot be. */
export function convertRule(rule: string): string | undefined {
  if (rule.startsWith(MCP_PREFIX)) {
    return convertMcpRule(rule);
  }

  const match = RULE_PATTERN.exec(rule);
  const tool = match?.groups?.tool;
  const specifier = match?.groups?.specifier;

  if (tool === 'Bash') {
    return convertShellRule(specifier);
  }

  if (tool === 'Read') {
    return convertPathRule('Read', specifier);
  }

  if (typeof tool === 'string' && WRITE_TOOLS.includes(tool)) {
    return convertPathRule('Write', specifier);
  }

  if (tool === 'WebFetch') {
    return convertWebFetchRule(specifier);
  }

  return undefined;
}

/**
 * `Bash(git push *)` becomes `Shell(git:push *)`: the command, then a glob for its arguments.
 * `Bash(ls)` becomes `Shell(ls:)`: without the colon, the Cursor CLI allows `ls` with any arguments.
 */
function convertShellRule(specifier: string | undefined): string | undefined {
  if (specifier === undefined) {
    return 'Shell(*)';
  }

  const suffix = ANY_ARGUMENTS_SUFFIXES.find((ending) => specifier.endsWith(ending));
  const command = typeof suffix === 'string' ? specifier.slice(0, -suffix.length) : specifier;
  const hasShellSyntax = SHELL_SYNTAX_PATTERN.test(command);
  const [base = '', ...args] = command.trim().split(WHITESPACE_PATTERN);
  const hasGlobInBase = GLOB_PATTERN.test(base);

  if (hasShellSyntax || hasGlobInBase || base === '') {
    return undefined;
  }

  const argsGlob = [...args, ...(typeof suffix === 'string' ? ['*'] : [])].join(' ');

  return `Shell(${base}:${argsGlob})`;
}

/**
 * Paths of Claude Code: `./x` and `/x` start at the project, `//x` at the root of the disk.
 * The Cursor CLI reads a relative path from the project and an absolute one as it is.
 */
function convertPathRule(tool: string, specifier: string | undefined): string | undefined {
  if (specifier === undefined) {
    return `${tool}(**)`;
  }

  if (specifier.startsWith(HOME_PREFIX)) {
    return undefined;
  }

  if (specifier.startsWith(ABSOLUTE_PREFIX)) {
    return `${tool}(${specifier.slice(1)})`;
  }

  const path = specifier.replace(/^\.?\//, '');

  return `${tool}(${path})`;
}

/** `WebFetch(domain:docs.github.com)` becomes `WebFetch(docs.github.com)`. */
function convertWebFetchRule(specifier: string | undefined): string | undefined {
  if (specifier === undefined) {
    return 'WebFetch(*)';
  }

  if (specifier.startsWith(DOMAIN_PREFIX)) {
    return `WebFetch(${specifier.slice(DOMAIN_PREFIX.length)})`;
  }

  return undefined;
}

/** `mcp__docs__search` becomes `Mcp(docs:search)`, and `mcp__docs` becomes `Mcp(docs:*)`. */
function convertMcpRule(rule: string): string {
  const name = rule.slice(MCP_PREFIX.length);
  const separatorIndex = name.indexOf(MCP_SEPARATOR);

  if (separatorIndex < 0) {
    return `Mcp(${name}:*)`;
  }

  const server = name.slice(0, separatorIndex);
  const tool = name.slice(separatorIndex + MCP_SEPARATOR.length);

  return `Mcp(${server}:${tool})`;
}

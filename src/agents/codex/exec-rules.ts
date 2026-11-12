import { GENERATED_HASH_NOTICE } from '../../shared/constants/output.ts';
import { PermissionDecision } from '../../shared/constants/permissions.ts';
import type { PermissionRule } from '../../shared/types/preset.ts';
import type { ResolvedArtifact } from '../../shared/types/resolution.ts';

/** A Bash rule of Claude Code with a specifier: `Bash(npm test *)`. */
const BASH_RULE_START = 'Bash(';
const BASH_RULE_END = ')';

/**
 * Shell syntax and wildcards that a Codex prefix rule cannot express.
 *
 * Matches:        "npm test && rm", "echo $HOME", "git * --force", "ls > out", "say 'hi'"
 * Does not match: "npm test", "git push --force", "rm -rf"
 */
const SHELL_SYNTAX_PATTERN = /["'`$\\|&;<>(){}*?[\]~]/;

const WHITESPACE_PATTERN = /\s+/;

/** A trailing ` *` or the older `:*` means "this command with any arguments". */
const ANY_ARGUMENTS_SUFFIXES: ReadonlyArray<string> = [' *', ':*'];

/**
 * Codex names for the decisions it gets. `allow` stays out: in Codex it runs a command
 * outside the sandbox without asking, which is more than an `allow` rule of Claude Code means.
 */
const CODEX_DECISIONS = {
  [PermissionDecision.Deny]: 'forbidden',
  [PermissionDecision.Ask]: 'prompt',
} as const;

type CodexDecision = keyof typeof CODEX_DECISIONS;

export type ExecRule = {
  /** The command and its first arguments, for example `["git", "push"]`. */
  pattern: ReadonlyArray<string>;
  decision: string;
  justification: string;
};

/**
 * The words of a Bash rule that Codex can match by prefix, or `undefined` when it cannot.
 * A rule without a wildcard becomes a prefix too: for `deny` and `ask` this is stricter.
 */
export function convertBashRule(rule: string): ReadonlyArray<string> | undefined {
  const isBashRule = rule.startsWith(BASH_RULE_START) && rule.endsWith(BASH_RULE_END);

  if (isBashRule === false) {
    return undefined;
  }

  const specifier = rule.slice(BASH_RULE_START.length, -BASH_RULE_END.length);
  const suffix = ANY_ARGUMENTS_SUFFIXES.find((ending) => specifier.endsWith(ending));
  const command = typeof suffix === 'string' ? specifier.slice(0, -suffix.length) : specifier;
  const hasShellSyntax = SHELL_SYNTAX_PATTERN.test(command);

  if (hasShellSyntax) {
    return undefined;
  }

  const words = command.trim().split(WHITESPACE_PATTERN);
  const hasWords = words.every((word) => word.length > 0);

  if (hasWords) {
    return words;
  }

  return undefined;
}

export function hasCodexDecision(decision: PermissionDecision): decision is CodexDecision {
  return decision in CODEX_DECISIONS;
}

export function createExecRule(
  resolved: ResolvedArtifact<PermissionRule>,
  decision: CodexDecision,
  pattern: ReadonlyArray<string>,
): ExecRule {
  const codexDecision = CODEX_DECISIONS[decision];

  return {
    pattern,
    decision: codexDecision,
    justification: `${resolved.artifact.key}: ${decision} from ${resolved.origin.name}`,
  };
}

/** `.codex/rules/tunestra.rules` in the Starlark format of Codex. */
export function renderExecRules(rules: ReadonlyArray<ExecRule>): string {
  const blocks = rules.map(renderExecRule);

  return `${[GENERATED_HASH_NOTICE, ...blocks].join('\n\n')}\n`;
}

/** JSON strings are valid Starlark strings. */
function renderExecRule(rule: ExecRule): string {
  const words = rule.pattern.map((word) => JSON.stringify(word));
  const pattern = words.join(', ');
  const decision = JSON.stringify(rule.decision);
  const justification = JSON.stringify(rule.justification);

  return [
    'prefix_rule(',
    `    pattern = [${pattern}],`,
    `    decision = ${decision},`,
    `    justification = ${justification},`,
    ')',
  ].join('\n');
}

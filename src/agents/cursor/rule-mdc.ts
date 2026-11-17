import { stringify } from 'yaml';

/**
 * A rule for `.cursor/rules`: Cursor reads only `.mdc` files there, and `alwaysApply` puts
 * the rule in every chat, like the rules of the other agents.
 */
export function renderRuleMdc(description: string | undefined, content: string): string {
  const frontmatter: Record<string, unknown> = {};

  if (typeof description === 'string') {
    frontmatter.description = description;
  }

  frontmatter.alwaysApply = true;

  const yaml = stringify(frontmatter);

  return `---\n${yaml}---\n${content}`;
}

import { stringify } from 'yaml';
import type { Subagent } from '../../shared/types/preset.ts';

/** Tools that change files; a read-only subagent keeps the tools that read and search. */
const WRITING_TOOLS = ['Write', 'Edit', 'NotebookEdit', 'Bash'] as const;

/** `.claude/agents/<name>.md`: the frontmatter of Claude Code and the instructions. */
export function renderSubagentMd(subagent: Subagent): string {
  const { key, description, model, effort, readOnly, body } = subagent;
  const frontmatter: Record<string, unknown> = {
    name: key,
    description,
  };

  if (typeof model.claude === 'string') {
    frontmatter.model = model.claude;
  }

  if (typeof effort === 'string') {
    frontmatter.effort = effort;
  }

  if (readOnly) {
    frontmatter.disallowedTools = WRITING_TOOLS;
  }

  const yaml = stringify(frontmatter);

  return `---\n${yaml}---\n${body}`;
}

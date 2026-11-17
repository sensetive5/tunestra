import { stringify } from 'yaml';
import type { Subagent } from '../../shared/types/preset.ts';

/** `.cursor/agents/<name>.md`; `readonly` keeps a subagent from changing files. */
export function renderCursorSubagent(subagent: Subagent): string {
  const { key, description, model, readOnly, body } = subagent;
  const frontmatter: Record<string, unknown> = {
    name: key,
    description,
  };

  if (typeof model.cursor === 'string') {
    frontmatter.model = model.cursor;
  }

  if (readOnly) {
    frontmatter.readonly = true;
  }

  const yaml = stringify(frontmatter);

  return `---\n${yaml}---\n${body}`;
}

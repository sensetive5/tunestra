import { stringify } from 'smol-toml';
import { GENERATED_HASH_NOTICE } from '../../shared/constants/output.ts';
import type { Subagent } from '../../shared/types/preset.ts';
import { renderTomlText } from './toml-text.ts';

/**
 * Codex has no read-only mode for a subagent: it can turn off the shell, but the subagent
 * still edits files with patches. So the instructions ask it not to.
 */
const READ_ONLY_INSTRUCTION = 'Do not create, edit or delete files.';

/**
 * `.codex/agents/<name>.toml`. Codex gives a subagent the sandbox, the permissions and the
 * MCP servers of the main session, so the file has only the model and the instructions.
 */
export function renderSubagentToml(subagent: Subagent): string {
  const { key, description, model, effort, readOnly, body } = subagent;
  const fields: Record<string, string> = {
    name: key,
    description,
  };

  if (typeof model.codex === 'string') {
    fields.model = model.codex;
  }

  if (typeof effort === 'string') {
    fields.model_reasoning_effort = effort;
  }

  const instructions = readOnly ? `${READ_ONLY_INSTRUCTION}\n\n${body}` : body;
  const parts = [
    GENERATED_HASH_NOTICE,
    stringify(fields).trimEnd(),
    renderTomlText('developer_instructions', instructions),
  ];

  if (readOnly) {
    const features = {
      features: {
        shell_tool: false,
      },
    };

    parts.push(stringify(features).trimEnd());
  }

  return `${parts.join('\n\n')}\n`;
}

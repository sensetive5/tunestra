import { describeArtifactSource } from '../../generate/describe-source.ts';
import { AGENTS_SKILLS_DIR, GENERATED_HASH_NOTICE } from '../../shared/constants/output.ts';
import type { OutputFile } from '../../shared/types/output.ts';
import type { Command } from '../../shared/types/preset.ts';
import type { ResolvedArtifact } from '../../shared/types/resolution.ts';
import { createFileOutput } from '../../shared/utils/outputs.ts';

/** Codex starts the skill only when people call it, like a command. */
const OPENAI_YAML = [
  GENERATED_HASH_NOTICE,
  'policy:',
  '  allow_implicit_invocation: false',
  '',
].join('\n');

/** `agents/openai.yaml` of a command skill: Codex runs it only on `$<name>`. */
export function planCommandPolicy(
  projectDir: string,
  command: ResolvedArtifact<Command>,
): OutputFile {
  const { key } = command.artifact;
  const source = describeArtifactSource(projectDir, command.origin, command.artifact.source);
  const path = `${AGENTS_SKILLS_DIR}/${key}/agents/openai.yaml`;

  return createFileOutput(path, OPENAI_YAML, source);
}

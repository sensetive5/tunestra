import { stringify } from 'yaml';
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

/**
 * Codex has no project commands, so a command becomes a skill with the same name that runs
 * only on `$<name>`. The skill gets `name` and `description`; other frontmatter of the
 * command belongs to Claude Code.
 */
export function planCommandSkill(
  projectDir: string,
  command: ResolvedArtifact<Command>,
): ReadonlyArray<OutputFile> {
  const { key, description, body } = command.artifact;
  const dir = `${AGENTS_SKILLS_DIR}/${key}`;
  const source = describeArtifactSource(projectDir, command.origin, command.artifact.source);
  const skillDescription = description ?? `The /${key} command`;
  const frontmatter = {
    name: key,
    description: skillDescription,
  };
  const yaml = stringify(frontmatter);
  const skill = `---\n${yaml}---\n${body}`;
  const skillPath = `${dir}/SKILL.md`;
  const policyPath = `${dir}/agents/openai.yaml`;
  const skillFile = createFileOutput(skillPath, skill, source);
  const policyFile = createFileOutput(policyPath, OPENAI_YAML, source);

  return [skillFile, policyFile];
}

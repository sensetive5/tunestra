import { stringify } from 'yaml';
import { AGENTS_SKILLS_DIR } from '../shared/constants/output.ts';
import { skillName } from '../shared/schemas/preset.ts';
import type { OutputFile } from '../shared/types/output.ts';
import type { Command } from '../shared/types/preset.ts';
import type { ResolvedArtifact } from '../shared/types/resolution.ts';
import { createFileOutput } from '../shared/utils/outputs.ts';
import { describeArtifactSource } from './describe-source.ts';

export type CommandSkills = {
  commands: ReadonlyArray<ResolvedArtifact<Command>>;
  notes: ReadonlyArray<string>;
};

/**
 * The commands whose names can be skill names. Codex and Cursor get commands as skills, so
 * the other ones are skipped with a note.
 */
export function selectCommandSkills(
  agentName: string,
  commands: ReadonlyArray<ResolvedArtifact<Command>>,
): CommandSkills {
  const notes: Array<string> = [];
  const selected = commands.filter((command) => {
    const isSkillName = skillName.safeParse(command.artifact.key).success;

    if (isSkillName === false) {
      notes.push(
        `${agentName} skips the command "${command.artifact.key}": a skill name needs lowercase letters, digits and single hyphens.`,
      );
    }

    return isSkillName;
  });

  return {
    commands: selected,
    notes,
  };
}

/**
 * A command as a skill with the same name in `.agents/skills/<name>/SKILL.md`, for agents
 * without project commands. `disable-model-invocation` makes Cursor run it only on
 * `/<name>`; Codex has its own file for that. The skill gets `name` and `description`;
 * other frontmatter of the command belongs to Claude Code. Every agent writes the same file.
 */
export function planCommandSkill(
  projectDir: string,
  command: ResolvedArtifact<Command>,
): OutputFile {
  const { key, description, body } = command.artifact;
  const source = describeArtifactSource(projectDir, command.origin, command.artifact.source);
  const skillDescription = description ?? `The /${key} command`;
  const frontmatter = {
    name: key,
    description: skillDescription,
    'disable-model-invocation': true,
  };
  const yaml = stringify(frontmatter);
  const skill = `---\n${yaml}---\n${body}`;
  const path = `${AGENTS_SKILLS_DIR}/${key}/SKILL.md`;

  return createFileOutput(path, skill, source);
}

import { LOCAL_CONFIG, LOCAL_DIR } from '../shared/constants/files.ts';
import { Level } from '../shared/constants/levels.ts';
import { GENERATED_NOTICE } from '../shared/constants/output.ts';
import type { Resolution, ResolvedArtifact } from '../shared/types/resolution.ts';
import { renderTable } from '../shared/utils/markdown.ts';
import { describeOrigin } from './describe-origin.ts';

const INTRO = `The personal level of this developer (\`${LOCAL_CONFIG}\`) changes the setup in AGENTS.md on this machine only. When this file and AGENTS.md disagree, follow this file.`;

const TURNED_OFF_INTRO = 'These artifacts of AGENTS.md are turned off on this machine.';

const NO_CHANGES = 'The personal level changes nothing yet.';

const CHANGING = `Edit \`${LOCAL_CONFIG}\` or \`${LOCAL_DIR}/\` and run \`tunestra setup\`.`;

type DescribedArtifact = {
  key: string;
  description?: string | undefined;
};

type ArtifactGroup = {
  kind: string;
  shared: ReadonlyArray<ResolvedArtifact<DescribedArtifact>>;
  local: ReadonlyArray<ResolvedArtifact<DescribedArtifact>>;
};

/**
 * What the personal level adds, overrides and turns off, compared with the committed
 * AGENTS.md. Claude Code reads it after CLAUDE.md as `CLAUDE.local.md`.
 */
export function renderLocalChanges(shared: Resolution, local: Resolution): string {
  const groups = listGroups(shared, local);
  const changedRows = groups.flatMap(listChangedRows);
  const turnedOffRows = groups.flatMap(listTurnedOffRows);
  const sections = [GENERATED_NOTICE, '# Personal setup', INTRO];

  if (changedRows.length > 0) {
    const table = renderTable(['Kind', 'Name', 'Level', 'Description'], changedRows);

    sections.push('## Added and changed', table);
  }

  if (turnedOffRows.length > 0) {
    const table = renderTable(['Kind', 'Name'], turnedOffRows);

    sections.push('## Turned off', TURNED_OFF_INTRO, table);
  }

  const hasChanges = changedRows.length > 0 || turnedOffRows.length > 0;

  if (hasChanges === false) {
    sections.push(NO_CHANGES);
  }

  sections.push(CHANGING);

  return `${sections.join('\n\n')}\n`;
}

function listGroups(shared: Resolution, local: Resolution): ReadonlyArray<ArtifactGroup> {
  return [
    createGroup('Rule', shared.rules, local.rules),
    createGroup('Skill', shared.skills, local.skills),
    createGroup('Command', shared.commands.map(labelCommand), local.commands.map(labelCommand)),
    createGroup('MCP server', shared.mcp, local.mcp),
    createGroup('Subagent', shared.subagents, local.subagents),
    createGroup('Variable', shared.env, local.env),
    createGroup(
      'Permission',
      shared.permissions.map(labelPermission),
      local.permissions.map(labelPermission),
    ),
  ];
}

function createGroup(
  kind: string,
  shared: ReadonlyArray<ResolvedArtifact<DescribedArtifact>>,
  local: ReadonlyArray<ResolvedArtifact<DescribedArtifact>>,
): ArtifactGroup {
  return {
    kind,
    shared,
    local,
  };
}

function listChangedRows(group: ArtifactGroup): ReadonlyArray<ReadonlyArray<string>> {
  const changed = group.local.filter((resolved) => resolved.origin.level === Level.Local);

  return changed.map((resolved) => {
    const origin = describeOrigin(resolved);
    const description = resolved.artifact.description ?? '';

    return [group.kind, resolved.artifact.key, origin, description];
  });
}

function listTurnedOffRows(group: ArtifactGroup): ReadonlyArray<ReadonlyArray<string>> {
  const localKeys = new Set(group.local.map((resolved) => resolved.artifact.key));
  const turnedOff = group.shared.filter(
    (resolved) => localKeys.has(resolved.artifact.key) === false,
  );

  return turnedOff.map((resolved) => [group.kind, resolved.artifact.key]);
}

function labelCommand<TArtifact extends DescribedArtifact>(
  resolved: ResolvedArtifact<TArtifact>,
): ResolvedArtifact<DescribedArtifact> {
  const artifact = {
    key: `/${resolved.artifact.key}`,
    description: resolved.artifact.description,
  };

  return {
    ...resolved,
    artifact,
  };
}

/** For example `deny Read(./.env)`: the same rule can be in two lists. */
function labelPermission(
  resolved: ResolvedArtifact<{ key: string; decision: string }>,
): ResolvedArtifact<DescribedArtifact> {
  const artifact = {
    key: `${resolved.artifact.decision} ${resolved.artifact.key}`,
  };

  return {
    ...resolved,
    artifact,
  };
}

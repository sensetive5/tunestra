import { describeOrigin } from '../../generate/describe-origin.ts';
import { describeArtifactSource } from '../../generate/describe-source.ts';
import type { Resolution, ResolvedArtifact } from '../../shared/types/resolution.ts';

type SourcedArtifact = {
  key: string;
  source: string;
};

/** For --verbose: every artifact, the level it comes from and the file to edit. */
export function describeResolution(resolution: Resolution): string {
  const projectDir = resolution.chain.project.dir;
  const sections = [
    describeSection('Rules', resolution.rules, projectDir),
    describeSection('Skills', resolution.skills, projectDir),
    describeSection('Commands', resolution.commands, projectDir),
    describeSection('MCP servers', resolution.mcp, projectDir),
  ];
  const filledSections = sections.filter((section) => section.length > 0);

  return filledSections.join('\n\n');
}

function describeSection<TArtifact extends SourcedArtifact>(
  title: string,
  artifacts: ReadonlyArray<ResolvedArtifact<TArtifact>>,
  projectDir: string,
): string {
  const isEmpty = artifacts.length === 0;

  if (isEmpty) {
    return '';
  }

  const rows = artifacts.map((resolved) => {
    const origin = describeOrigin(resolved);
    const source = describeArtifactSource(projectDir, resolved.origin, resolved.artifact.source);

    return [resolved.artifact.key, origin, source];
  });
  const keyWidth = measureColumn(rows, 0);
  const originWidth = measureColumn(rows, 1);
  const lines = rows.map(([key = '', origin = '', source = '']) => {
    const keyCell = key.padEnd(keyWidth);
    const originCell = origin.padEnd(originWidth);

    return `  ${keyCell}  ${originCell}  ${source}`;
  });

  return [title, ...lines].join('\n');
}

function measureColumn(rows: ReadonlyArray<ReadonlyArray<string>>, column: number): number {
  const widths = rows.map((row) => row[column]?.length ?? 0);

  return Math.max(...widths);
}

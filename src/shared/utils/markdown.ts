/**
 * A pipe or a line break inside a cell would break the table.
 *
 * Matches: "|" in "a | b", "\n" and "\r\n" in "line one\nline two"
 */
const TABLE_BREAKING_PATTERN = /\||\r?\n/g;

export function renderTable(
  header: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<string>>,
): string {
  const headerLine = renderRow(header);
  const separatorCells = header.map(() => '---');
  const separatorLine = `|${separatorCells.join('|')}|`;
  const rowLines = rows.map(renderRow);

  return [headerLine, separatorLine, ...rowLines].join('\n');
}

function renderRow(cells: ReadonlyArray<string>): string {
  const escapedCells = cells.map(escapeCell);

  return `| ${escapedCells.join(' | ')} |`;
}

function escapeCell(cell: string): string {
  return cell.replace(TABLE_BREAKING_PATTERN, replaceTableBreaking);
}

function replaceTableBreaking(match: string): string {
  if (match === '|') {
    return '\\|';
  }

  return ' ';
}

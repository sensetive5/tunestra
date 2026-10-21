const BLOCK_START = '# >>> tunestra (generated, do not edit)';
const BLOCK_START_PREFIX = '# >>> tunestra';
const BLOCK_END = '# <<< tunestra';

/** Paths are relative to the project and get a leading `/`, so they match only at the root. */
export function renderGitignoreBlock(paths: ReadonlyArray<string>): string {
  const lines = paths.map((path) => `/${path}`);

  return [BLOCK_START, ...lines, BLOCK_END].join('\n');
}

/** Replaces the tunestra block in `.gitignore`, or adds it at the end; other lines stay. */
export function updateGitignore(existing: string | undefined, block: string): string {
  if (existing === undefined) {
    return `${block}\n`;
  }

  const start = existing.indexOf(BLOCK_START_PREFIX);
  const end = existing.indexOf(BLOCK_END);
  const hasBlock = start >= 0 && end > start;

  if (hasBlock) {
    const before = existing.slice(0, start);
    const after = existing.slice(end + BLOCK_END.length);

    return `${before}${block}${after}`;
  }

  const content = existing.trimEnd();

  if (content === '') {
    return `${block}\n`;
  }

  return `${content}\n\n${block}\n`;
}

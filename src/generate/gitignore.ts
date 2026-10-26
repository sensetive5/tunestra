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

/** Removes the tunestra block and the empty lines around it; other lines stay as they are. */
export function removeGitignoreBlock(existing: string): string {
  const start = existing.indexOf(BLOCK_START_PREFIX);
  const end = existing.indexOf(BLOCK_END);
  const hasBlock = start >= 0 && end > start;

  if (hasBlock === false) {
    return existing;
  }

  const before = existing.slice(0, start).trimEnd();
  const after = existing.slice(end + BLOCK_END.length).trim();
  const parts = [before, after].filter((part) => part.length > 0);

  if (parts.length === 0) {
    return '';
  }

  return `${parts.join('\n\n')}\n`;
}

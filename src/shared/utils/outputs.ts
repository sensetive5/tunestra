import { OutputKind } from '../constants/output.ts';
import type { OutputFile } from '../types/output.ts';

export function createFileOutput(path: string, content: string, source: string): OutputFile {
  return {
    kind: OutputKind.File,
    path,
    source,
    content,
  };
}

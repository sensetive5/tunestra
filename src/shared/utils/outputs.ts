import { OutputKind } from '../constants/output.ts';
import type { OutputFile } from '../types/output.ts';

export function createFileOutput(path: string, content: string): OutputFile {
  return {
    kind: OutputKind.File,
    path,
    content,
  };
}

import { downloadTemplate } from 'giget';
import { getErrorMessage } from '../shared/errors/get-error-message.ts';
import { TunestraError } from '../shared/errors/tunestra-error.ts';
import type { GitSource } from '../shared/types/source.ts';
import { describeRepository } from './parse-git-source.ts';

/**
 * Downloads a repository as an archive over HTTPS, so git is not needed. A private
 * repository needs a token with read access in the GIGET_AUTH environment variable.
 */
export async function downloadWithGiget(source: GitSource, dir: string): Promise<void> {
  const repository = describeRepository(source);

  try {
    await downloadTemplate(repository, {
      dir,
      force: true,
      forceClean: true,
      silent: true,
    });
  } catch (error) {
    const reason = getErrorMessage(error);

    throw new TunestraError(
      `Could not download ${repository}: ${reason}. Check the name and the ref; for a private repository, set GIGET_AUTH to a token with read access`,
    );
  }
}

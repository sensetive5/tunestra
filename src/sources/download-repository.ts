import { type DownloadTemplateOptions, downloadTemplate } from 'giget';
import { GIT_TOKEN_VARIABLE } from '../shared/constants/sources.ts';
import { getErrorMessage } from '../shared/errors/get-error-message.ts';
import { TunestraError } from '../shared/errors/tunestra-error.ts';
import type { DownloadRepository } from '../shared/types/source.ts';
import { describeRepository } from './parse-git-source.ts';

/** Downloads a repository as an archive over HTTPS, so git is not needed. */
export const downloadRepository: DownloadRepository = async (source, dir) => {
  const repository = describeRepository(source);
  const token = process.env[GIT_TOKEN_VARIABLE];
  const options = createDownloadOptions(dir, token);

  try {
    await downloadTemplate(repository, options);
  } catch (error) {
    const reason = getErrorMessage(error);

    throw new TunestraError(
      `Could not download ${repository}: ${reason}. Check the name and the ref; for a private repository, set ${GIT_TOKEN_VARIABLE} to a token with read access`,
    );
  }
};

/** The token is passed only when it is set. */
function createDownloadOptions(dir: string, token: string | undefined): DownloadTemplateOptions {
  const options = {
    dir,
    force: true,
    forceClean: true,
    silent: true,
  };

  if (token === undefined) {
    return options;
  }

  return {
    ...options,
    auth: token,
  };
}

import { type DownloadTemplateOptions, downloadTemplate } from 'giget';
import { getErrorMessage } from '../shared/errors/get-error-message.ts';
import { TunestraError } from '../shared/errors/tunestra-error.ts';
import type { DownloadRepository } from '../shared/types/source.ts';
import { describeRepository } from './parse-git-source.ts';

/** Token for private repositories; tunestra's own name, whatever does the download. */
const GIT_TOKEN_VARIABLE = 'TUNESTRA_GIT_TOKEN';

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

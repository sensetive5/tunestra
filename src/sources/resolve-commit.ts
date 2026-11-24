import { GIT_TOKEN_VARIABLE } from '../shared/constants/sources.ts';
import { getErrorMessage } from '../shared/errors/get-error-message.ts';
import { TunestraError } from '../shared/errors/tunestra-error.ts';
import { COMMIT_PATTERN } from '../shared/schemas/lock.ts';
import type { GitSource, ResolveCommit } from '../shared/types/source.ts';
import { describeRepository } from './parse-git-source.ts';

const GITHUB_API = 'https://api.github.com';
const GITLAB_API = 'https://gitlab.com/api/v4';

/** `HEAD` is the default branch for both providers. */
const DEFAULT_REF = 'HEAD';

type CommitRequest = {
  url: string;
  headers: Record<string, string>;
  /** The commit hash from the body of the response. */
  readCommit: (response: Response) => Promise<unknown>;
};

/** Asks the API of the provider, so git is not needed. A ref that is a commit is kept. */
export const resolveCommit: ResolveCommit = async (source) => {
  const { ref } = source;
  const isCommit = typeof ref === 'string' && COMMIT_PATTERN.test(ref);

  if (isCommit) {
    return ref;
  }

  const repository = describeRepository(source);
  const token = process.env[GIT_TOKEN_VARIABLE];
  const request = createCommitRequest(source, token);
  const advice = `Check the name and the ref; for a private repository, set ${GIT_TOKEN_VARIABLE} to a token with read access`;
  let response: Response;

  try {
    response = await fetch(request.url, { headers: request.headers });
  } catch (error) {
    const reason = getErrorMessage(error);

    throw new TunestraError(`Could not find the commit of ${repository}: ${reason}. ${advice}`);
  }

  if (response.ok === false) {
    throw new TunestraError(
      `Could not find the commit of ${repository}: HTTP ${response.status}. ${advice}`,
    );
  }

  const commit = await request.readCommit(response);

  if (typeof commit === 'string' && COMMIT_PATTERN.test(commit)) {
    return commit;
  }

  throw new TunestraError(`Could not find the commit of ${repository}: unexpected answer`);
};

function createCommitRequest(source: GitSource, token: string | undefined): CommitRequest {
  const ref = encodeURIComponent(source.ref ?? DEFAULT_REF);
  const auth: Record<string, string> =
    token === undefined ? {} : { Authorization: `Bearer ${token}` };

  if (source.provider === 'github') {
    return {
      url: `${GITHUB_API}/repos/${source.owner}/${source.repo}/commits/${ref}`,
      headers: {
        ...auth,
        Accept: 'application/vnd.github.sha',
      },
      readCommit: async (response) => (await response.text()).trim(),
    };
  }

  const project = encodeURIComponent(`${source.owner}/${source.repo}`);

  return {
    url: `${GITLAB_API}/projects/${project}/repository/commits/${ref}`,
    headers: auth,
    readCommit: async (response) => {
      const body: unknown = await response.json();

      return typeof body === 'object' && body !== null && 'id' in body ? body.id : undefined;
    },
  };
}

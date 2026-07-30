// Adapted from https://github.com/mitchheddles/github-action-status-check

import childproc from 'child_process';
import { Clog, LOGLEVEL } from '@fdebijl/clog';

import { formatError } from '../errors/index.js';

const clog = new Clog();

export async function setStatus(context: string, state: 'success' | 'failure' | 'pending', description: string): Promise<Response> {
  const [owner, repo] = (process.env.GITHUB_REPOSITORY as string).split('/');

  function getCurrentCommitSha() {
    return childproc
      .execSync('git rev-parse HEAD')
      .toString()
      .trim();
  }

  // The SHA provied by GITHUB_SHA is the merge (PR) commit.
  // We need to get the current commit sha ourself.
  const sha = getCurrentCommitSha();

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/statuses/${sha}`, {
    method: 'POST',
    body: JSON.stringify({
      state,
      description,
      context,
    }),
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  // A rejected status update leaves the check hanging on 'pending' forever, so make sure the reason
  // is in the log rather than hidden in an ignored response.
  if (!response.ok) {
    const body = await response.text().catch((error) => `<could not read response body: ${formatError(error)}>`);
    clog.log(`Could not set status [${context}] to '${state}': GitHub returned ${response.status} ${response.statusText} - ${body}`, LOGLEVEL.ERROR);
  }

  return response;
}

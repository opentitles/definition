// Adapted from https://github.com/mitchheddles/github-action-status-check

const cp = require('child_process');
const fetch = require('node-fetch');

export async function setStatus(context: string, state: 'success' | 'failure' | 'pending', description: string) {
  const [owner, repo] = (process.env.GITHUB_REPOSITORY as string).split('/');

  function getCurrentCommitSha() {
    return cp
      .execSync(`git rev-parse HEAD`)
      .toString()
      .trim();
  }
  
  // The SHA provied by GITHUB_SHA is the merge (PR) commit.
  // We need to get the current commit sha ourself.
  const sha = getCurrentCommitSha();

  return fetch(`https://api.github.com/repos/${owner}/${repo}/statuses/${sha}`, {
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
}

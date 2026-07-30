
import * as core from '@actions/core';
import * as github from '@actions/github';
import { HttpClient, Headers as GithubHeaders } from '@actions/http-client';
import { Clog, LOGLEVEL } from '@fdebijl/clog';

import { Pull } from '../../domain/Pull.js';
import { formatError } from '../errors/index.js';

const clog = new Clog();

const previewHeader = 'application/vnd.github.groot-preview+json';

// Invisible in the rendered comment, but lets subsequent runs recognize their own comment and edit
// it instead of stacking a new one on every push.
const COMMENT_MARKER = '<!-- opentitles-definition-validator -->';

const getPulls = async (repoToken: string, repo: string, commitSha: string): Promise<Pull[]> => {
  const http = new HttpClient('http-client-add-pr-comment');

  const additionalHeaders = {
    [GithubHeaders.Accept]: previewHeader,
    ['Authorization']: `token ${repoToken}`,
  };

  const body = await http.getJson(
    `https://api.github.com/repos/${repo}/commits/${commitSha}/pulls`,
    additionalHeaders
  );

  return body.result as Pull[];
};

export async function addComment(message: string): Promise<void> {
  try {
    const repoToken = process.env.GITHUB_TOKEN as string;

    core.debug(`input message: ${message}`);

    const {
      payload: { pull_request: pullRequest, repository },
      sha: commitSha,
    } = github.context;

    const repoFullName = repository?.full_name as string;

    let issueNumber;

    if (pullRequest && pullRequest.number) {
      issueNumber = pullRequest.number;
    } else {
      // If this is not a pull request, attempt to find a PR matching the sha
      const pulls = await getPulls(repoToken, repoFullName, commitSha);
      issueNumber = pulls.length ? pulls[0].number : null;
    }

    if (!issueNumber) {
      core.warning('this action only works on pull_request events or other commits associated with a pull');
      core.setOutput('comment-created', 'false');
      return;
    }

    const [owner, repo] = repoFullName.split('/');

    const octokit = github.getOctokit(repoToken);
    const body = `${COMMENT_MARKER}\n${message}`;

    core.debug('looking for an existing validator comment to update');

    // Paginate - on a long-running PR our comment can easily fall off the first page, and missing it
    // would mean posting a duplicate instead of editing.
    const comments = await octokit.paginate(octokit.rest.issues.listComments, {
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 100,
    });

    const existing = comments.find(
      (c) => c.user?.type === 'Bot' && c.body?.includes(COMMENT_MARKER)
    );

    if (existing) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existing.id,
        body,
      });

      core.debug(`updated existing comment ${existing.id}`);
      core.setOutput('comment-created', 'false');
      core.setOutput('comment-updated', 'true');
      core.setOutput('comment-id', String(existing.id));
      return;
    }

    const { data: created } = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });

    core.debug(`created new comment ${created.id}`);
    core.setOutput('comment-created', 'true');
    core.setOutput('comment-updated', 'false');
    core.setOutput('comment-id', String(created.id));
    return;
  } catch (error) {
    // core.setFailed only surfaces the message, so log the full error as well - a swallowed stack
    // here means nobody can tell why the PR never got its fixlist.
    const formatted = formatError(error);
    clog.log(`Could not add a comment to the PR: ${formatted}`, LOGLEVEL.ERROR);
    core.setFailed(`Could not add a comment to the PR: ${formatted}`);
    return;
  }
}

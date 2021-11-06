
import core from '@actions/core';
import github from '@actions/github';
import { HttpClient, Headers as GithubHeaders } from '@actions/http-client';
import { Pull } from '../../domain/Pull';

const previewHeader = "application/vnd.github.groot-preview+json";

const getPulls = async (repoToken: string, repo: string, commitSha: string): Promise<Pull[]> => {
  const http = new HttpClient("http-client-add-pr-comment");

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
    const allowRepeats = Boolean(core.getInput("allow-repeats") === "true");

    core.debug(`input message: ${message}`);
    core.debug(`input allow-repeats: ${allowRepeats}`);

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
      core.warning(
        "this action only works on pull_request events or other commits associated with a pull"
      );
      core.setOutput("comment-created", "false");
      return;
    }

    const [owner, repo] = repoFullName.split("/");

    const octokit = github.getOctokit(repoToken);

    if (allowRepeats === false) {
      core.debug("repeat comments are disallowed, checking for existing");

      const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: issueNumber,
      });

      const filteredComments = comments.filter(
        (c: any) => c.body === message && c.user.login === "github-actions[bot]"
      );

      if (filteredComments.length) {
        core.warning("the issue already contains this message");
        core.setOutput("comment-created", "false");
        return;
      }
    }

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: message,
    });

    core.setOutput("comment-created", "true");
    return;
  } catch (error) {
    core.setFailed((error as Error).message);
    return;
  }
}

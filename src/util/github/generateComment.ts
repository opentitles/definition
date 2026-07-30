import { Clog, LOGLEVEL } from '@fdebijl/clog';

import { HostError, TitleError, IdError } from '../../domain/index.js';
import { addComment } from './addComment.js';

const clog = new Clog()

type FeedError = HostError | TitleError | IdError;

// A full fixlist runs to hundreds of lines, which buries the rest of the PR, so each category folds
// away behind a summary. The blank lines around the list are load-bearing: without them GitHub
// renders the markdown inside <details> as literal text.
const collapsibleSection = (summary: string, errors: FeedError[]): string => {
  let section = `<details>\n<summary><strong>${summary}</strong></summary>\n\n`;

  errors.forEach(error => {
    section += `- [ ] ${error.medium.name}:${error.feedname} - ${error.message}\n`
  });

  section += '\n</details>\n\n';
  return section;
};

export const generateComment = async (hostErrors: HostError[], titleErrors: TitleError[], idErrors: IdError[], minutes: number, seconds: number): Promise<void> => {
  if (!process.env.GITHUB_REPOSITORY) {
    clog.log('Not commenting since we\'re not running as an action', LOGLEVEL.INFO);
    return;
  }

  if (!hostErrors && !titleErrors && !idErrors) {
    await addComment('The definition file passed validation without any errors, a maintainer will merge this PR shortly.');
    clog.log('Commenting that we passed.', LOGLEVEL.DEBUG);
    return;
  }

  let errors = 0;
  if (hostErrors) errors += hostErrors.length;
  if (titleErrors) errors += titleErrors.length;
  if (idErrors) errors += idErrors.length;

  if (errors === 0) {
    await addComment('The definition file passed validation without any errors, a maintainer will merge this PR shortly.');
    clog.log('Commenting that we passed.', LOGLEVEL.DEBUG);
    return;
  }

  let comment = `The definition validator finished its run in ${minutes}m ${seconds}s and encountered ${errors} ${errors > 1 ? 'errors' : 'error'}:\n\n`;

  if (hostErrors && hostErrors.length > 0) {
    comment += collapsibleSection(`[${hostErrors.length}] Network or host ${hostErrors.length > 1 ? 'errors' : 'error'}`, hostErrors);
  }

  if (titleErrors && titleErrors.length > 0) {
    comment += collapsibleSection(`[${titleErrors.length}] Title detection or parsing ${titleErrors.length > 1 ? 'errors' : 'error'}`, titleErrors);
  }

  if (idErrors && idErrors.length > 0) {
    comment += collapsibleSection(`[${idErrors.length}] ID detection or parsing ${idErrors.length > 1 ? 'errors' : 'error'}`, idErrors);
  }

  comment += 'Please address these issues by updating the definition and amending this PR with your updates.';
  await addComment(comment);
  clog.log('Commenting fixlist.', LOGLEVEL.DEBUG);
  return;
};
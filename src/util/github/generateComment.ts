import { Clog, LOGLEVEL } from '@fdebijl/clog';

import { HostError, TitleError, IdError } from "../../domain";
import { addComment } from "./addComment";
import { CONFIG } from '../../config';

const clog = new Clog(CONFIG.MIN_LOGLEVEL)

export const generateComment = async (hostErrors: HostError[], titleErrors: TitleError[], idErrors: IdError[]) => {
  if (!process.env.GITHUB_REPOSITORY) {
    clog.log('Not commenting since we\'re not running as an action', LOGLEVEL.INFO);
    return;
  }

  if (!hostErrors && !titleErrors && !idErrors) {
    addComment('The definition file passed validation without any errors, a maintainer will merge this PR shortly.');
    clog.log('Commenting that we passed.', LOGLEVEL.DEBUG);
    return;
  }

  let errors = 0;
  if (hostErrors) errors += hostErrors.length;
  if (titleErrors) errors += titleErrors.length;
  if (idErrors) errors += idErrors.length;

  if (errors < 1) {
    addComment('The definition file passed validation without any errors, a maintainer will merge this PR shortly.');
    clog.log('Commenting that we passed.', LOGLEVEL.DEBUG);
    return;
  }

  let comment = `The definition validator encountered ${errors} ${errors > 1 ? 'errors' : 'error'}:\n\n`;

  if (hostErrors) {
    comment += `**[${hostErrors.length}] Network or host ${hostErrors.length > 1 ? 'errors' : 'error'}:**\n`
    hostErrors.forEach(hostError => {
      comment += `- [ ] ${hostError.medium.name}:${hostError.feedname} - ${hostError.message}\n`
    });
    comment += `\n`;
  }

  if (titleErrors) {
    comment += `**[${titleErrors.length}] Title detection or parsing ${titleErrors.length > 1 ? 'errors' : 'error'}:**\n`
    titleErrors.forEach(titleError => {
      comment += `- [ ] ${titleError.medium.name}:${titleError.feedname} - ${titleError.message}\n`
    });
    comment += `\n`;
  }

  if (idErrors) {
    comment += `**[${idErrors.length}] ID detection or parsing ${idErrors.length > 1 ? 'errors' : 'error'}:**\n`
    idErrors.forEach(idError => {
      comment += `- [ ] ${idError.medium.name}:${idError.feedname} - ${idError.message}\n`
    });
    comment += `\n`;
  }

  comment += 'Please address these issues by updating the definition and ammending this PR with your updates.';
  addComment(comment);
  clog.log('Commenting fixlist.', LOGLEVEL.DEBUG);
  return;
};
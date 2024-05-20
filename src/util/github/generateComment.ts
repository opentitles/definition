import { Clog, LOGLEVEL } from '@fdebijl/clog';

import { HostError, TitleError, IdError } from '../../domain';
import { addComment } from './addComment';

const clog = new Clog()

export const generateComment = async (hostErrors: HostError[], titleErrors: TitleError[], idErrors: IdError[], minutes: number, seconds: number): Promise<void> => {
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

  if (errors === 0) {
    addComment('The definition file passed validation without any errors, a maintainer will merge this PR shortly.');
    clog.log('Commenting that we passed.', LOGLEVEL.DEBUG);
    return;
  }

  let comment = `The definition validator finished its run in ${minutes}m ${seconds}s and encountered ${errors} ${errors > 1 ? 'errors' : 'error'}:\n\n`;

  if (hostErrors && hostErrors.length > 0) {
    comment += `**[${hostErrors.length}] Network or host ${hostErrors.length > 1 ? 'errors' : 'error'}:**\n`
    hostErrors.forEach(hostError => {
      comment += `- [ ] ${hostError.medium.name}:${hostError.feedname} - ${hostError.message}\n`
    });
    comment += '\n';
  }

  if (titleErrors && titleErrors.length > 0) {
    comment += `**[${titleErrors.length}] Title detection or parsing ${titleErrors.length > 1 ? 'errors' : 'error'}:**\n`
    titleErrors.forEach(titleError => {
      comment += `- [ ] ${titleError.medium.name}:${titleError.feedname} - ${titleError.message}\n`
    });
    comment += '\n';
  }

  if (idErrors && idErrors.length > 0) {
    comment += `**[${idErrors.length}] ID detection or parsing ${idErrors.length > 1 ? 'errors' : 'error'}:**\n`
    idErrors.forEach(idError => {
      comment += `- [ ] ${idError.medium.name}:${idError.feedname} - ${idError.message}\n`
    });
    comment += '\n';
  }

  comment += 'Please address these issues by updating the definition and amending this PR with your updates.';
  addComment(comment);
  clog.log('Commenting fixlist.', LOGLEVEL.DEBUG);
  return;
};
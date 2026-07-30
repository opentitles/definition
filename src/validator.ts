import moment from 'moment';
import { Clog, LOGLEVEL } from '@fdebijl/clog';

import { HostError, TitleError, IdError } from './domain/index.js';
import { validateArticle } from './util/validation/index.js';
import { getFlatMediaDefinition } from './util/media/index.js';
import { getFeedItems, getRandomArticle, isHostError } from './util/rss/index.js';
import { initStatuses, closeStatuses, generateComment } from './util/github/index.js';
import { formatError } from './util/errors/index.js';
import { CONFIG } from './config.js';

const clog = new Clog(CONFIG.MIN_LOGLEVEL);

// A validator that dies or throws quietly reports a green run while having checked nothing at all,
// so anything that escapes the loop below still has to end up in the log and in the exit code.
process.on('unhandledRejection', (reason) => {
  clog.log(`Unhandled rejection: ${formatError(reason)}`, LOGLEVEL.FATAL);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  clog.log(`Uncaught exception: ${formatError(error)}`, LOGLEVEL.FATAL);
  process.exit(1);
});

const run = async (): Promise<number> => {
  const mediaList = await getFlatMediaDefinition();
  const start = moment();

  const mediaToProcess = process.argv.slice(2);

  await initStatuses();

  const hostErrors: HostError[] = [];
  const titleErrors: TitleError[] = [];
  const idErrors: IdError[] = [];

  for (const medium of mediaList) {
    if (mediaToProcess.length > 0 && !mediaToProcess.includes(medium.name)) {
      continue;
    }

    for (const feedname of medium.feeds) {
      clog.log(`CHCK ${medium.name}:${feedname}`);

      try {
        const feedItems = await getFeedItems(medium.prefix + feedname + medium.suffix, medium, feedname);

        if (isHostError(feedItems)) {
          hostErrors.push(feedItems);
          clog.log(`FAIL ${medium.name}:${feedname}: ${feedItems.message}`, LOGLEVEL.ERROR);
          continue;
        }

        const randomArticle = await getRandomArticle(feedItems);
        const { hostError, titleError, idError } = await validateArticle(randomArticle, medium, feedname);
        let pass = true;

        if (hostError) {
          hostErrors.push(hostError);
          pass = false;
          clog.log(`FAIL ${medium.name}:${feedname}: ${hostError.message}`, LOGLEVEL.ERROR);
        }

        if (titleError) {
          titleErrors.push(titleError);
          pass = false;
          clog.log(`FAIL ${medium.name}:${feedname}: ${titleError.message}`, LOGLEVEL.ERROR);
        }

        if (idError) {
          idErrors.push(idError);
          pass = false;
          clog.log(`FAIL ${medium.name}:${feedname}: ${idError.message}`, LOGLEVEL.ERROR);
        }

        if (pass) {
          clog.log(`PASS ${medium.name}:${feedname}`);
        }
      } catch (error) {
        // An unexpected throw means this feed was never actually validated, so it counts as a
        // failure - logging it and moving on would let a broken run finish with green checks.
        const message = `Unexpected error while validating: ${formatError(error)}`;
        hostErrors.push({ message, article: {}, medium, feedname });
        clog.log(`FAIL ${medium.name}:${feedname}: ${message}`, LOGLEVEL.ERROR);
      }
    }
  }

  // Done with all media, wrap up by setting the status on the checks and adding a comment indicating which media need fixing.
  const end = moment();
  const minutes = end.diff(start, 'minutes');
  const seconds = (end.diff(start, 'seconds')) % 60;
  clog.log(`Finished scraping run after ${minutes}m ${seconds}s`);
  await closeStatuses(hostErrors, titleErrors, idErrors);
  await generateComment(hostErrors, titleErrors, idErrors, minutes, seconds);

  return (hostErrors.length + titleErrors.length + idErrors.length) > 0 ? 1 : 0;
}

run().then((exitCode) => {
  process.exit(exitCode);
}).catch((error) => {
  clog.log(`Validation run aborted: ${formatError(error)}`, LOGLEVEL.FATAL);
  process.exit(1);
});

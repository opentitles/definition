import moment from 'moment';
import { Clog, LOGLEVEL } from '@fdebijl/clog';

import { HostError, TitleError, IdError } from './domain';
import { validateArticle } from './util/validation';
import { getFlatMediaDefinition } from './util/media';
import { getFeedItems, getRandomArticle } from './util/rss';
import { initStatuses, closeStatuses, generateComment } from './util/github';
import { Item } from 'rss-parser';
import { CONFIG } from './config';

const clog = new Clog(CONFIG.MIN_LOGLEVEL);

getFlatMediaDefinition().then(async (mediaList) => {
  const start = moment();

  const mediaToProcess = process.argv.slice(2);

  await initStatuses();

  const hostErrors: HostError[] = []
  const titleErrors: TitleError[] = [];
  const idErrors: IdError[] = [];

  const checkMedium = async (limit: number, i: number = 0) => {
    if (i < limit) {
      const medium = mediaList[i];

      if (mediaToProcess.length > 0) {
        if (!mediaToProcess.includes(medium.name)) {
          i++;
          checkMedium(limit, i);
          return;
        }
      }

      const checkFeed = async (innerLimit: number, j: number = 0) => {
        if (j < innerLimit) {
          const feedname = medium.feeds[j];
          clog.log(`CHCK ${medium.name}:${feedname}`);
          const feedItems = await getFeedItems(medium.prefix + feedname + medium.suffix, medium, feedname);

          if ((<HostError>feedItems).message) {
            clog.log(`FAIL ${medium.name}:${feedname}: ${(<HostError>feedItems).message}`, LOGLEVEL.ERROR);
            j++;
            checkFeed(innerLimit, j);
            return;
          }

          try {
            const randomArticle = await getRandomArticle(feedItems as Item[]);
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
            clog.log(error, LOGLEVEL.ERROR);
            clog.log(`FAIL ${medium.name}:${feedname}`, LOGLEVEL.ERROR);
          } finally {
            j++;
            checkFeed(innerLimit, j);
            return;
          }
        } else {
          // Done with all feeds for this medium, go to next one
          i++;
          checkMedium(limit, i);
          return;
        }
      }

      checkFeed(medium.feeds.length);
    } else {
      // Done with all media, wrap up by setting the status on the checks and adding a comment indicating which media need fixing.
      const end = moment();
      const minutes = end.diff(start, 'minutes');
      const seconds = end.diff(start, 'seconds') % 60;
      clog.log(`Finished scraping run after ${minutes}m ${seconds}s`);
      await closeStatuses(hostErrors, titleErrors, idErrors);
      await generateComment(hostErrors, titleErrors, idErrors, minutes, seconds);
      setTimeout(() => {
        if ((hostErrors.length + titleErrors.length + idErrors.length) > 0) {
          process.exit(1);
        } else {
          process.exit(0);
        }
      }, 15 * 1000);
    }
  }

  checkMedium(mediaList.length);
});

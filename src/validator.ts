import moment from 'moment';
import { Clog, LOGLEVEL } from '@fdebijl/clog';

import { HostError, TitleError, IdError } from './domain';
import { validateArticle } from './util/validation';
import { getFlatMediaDefinition } from './util/media';
import { getFeedItems, getRandomArticle } from './util/rss';
import { initStatuses, closeStatuses } from './util/github';

const clog =  new Clog(LOGLEVEL.DEBUG);

getFlatMediaDefinition().then(async (mediaList) => {
  const start = moment();

  await initStatuses();

  const hostErrors: HostError[] = []
  const titleErrors: TitleError[] = [];
  const idErrors: IdError[] = [];

  await Promise.all(mediaList.map(async medium => {
    await Promise.all(medium.feeds.map(async feedname => {
      clog.log(`Validating ${medium.name}:${feedname}.`, LOGLEVEL.INFO);
      const feedItems = await getFeedItems(medium.prefix + feedname + medium.suffix);
      const randomArticle = await getRandomArticle(feedItems);
      const { hostError, titleError, idError } = await validateArticle(randomArticle, medium);

      if (hostError) {
        hostErrors.push(hostError);
      }

      if (titleError) {
        titleErrors.push(titleError);
      }

      if (idError) {
        idErrors.push(idError);
      }
    }));
  }));

  await closeStatuses(hostErrors, titleErrors, idErrors);
  const end = moment();
  clog.log(`Finished scraping run after ${end.diff(start, 'seconds')}s`, LOGLEVEL.INFO);
});

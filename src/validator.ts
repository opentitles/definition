import { HostError, TitleError, IdError } from './domain';
import { validateArticle } from './util/validation';
import { getFlatMediaDefinition } from './util/media';
import { getFeedItems, getRandomArticle } from './util/rss';
import { initStatuses, closeStatuses } from './util/github';

getFlatMediaDefinition().then(async (mediaList) => {
  await initStatuses();

  const hostErrors: HostError[] = []
  const titleErrors: TitleError[] = [];
  const idErrors: IdError[] = [];

  const checkMedium = async (limit: number, i: number = 0) => {
    if (i < limit) {
      const medium = mediaList[i];

      const checkFeed = async (innerLimit: number, j: number = 0) => {
        if (j < innerLimit) {
          const feedname = medium.feeds[j];
          console.log(`Validating ${medium.name}:${feedname}.`);
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

          j++;
          checkFeed(innerLimit, j);
        } else {
          // Done with all feeds for this medium, go to next one
          i++;
          checkMedium(limit, i);
        }
      }

      checkFeed(medium.feeds.length);
    } else {
      // Done with all media
      await closeStatuses(hostErrors, titleErrors, idErrors);
      process.exit(0);
    }
  }

  checkMedium(mediaList.length);
});

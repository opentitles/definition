import Parser, { Item } from 'rss-parser';
import { HostError } from '../../domain/index.js';
import { ParserFeedType } from '../../domain/ParserFeedType.js';
import { ParserItemType } from '../../domain/ParserItemType.js';
import { formatError } from '../errors/index.js';

const parser = new Parser<ParserFeedType, ParserItemType>({
  headers: {'User-Agent': 'OpenTitles Scraper by floris@debijl.xyz'},
  timeout: 5000,
  maxRedirects: 3,
  customFields: {
    item: ['wp:arc_uuid'],
  },
});

export const getFeedItems = async (url: string, medium: MediumDefinition, feedname: string): Promise<Item[] | HostError> => {
  try {
    const feed = await parser.parseURL(url);
    return feed.items as Item[];
  } catch (error) {
    return {
      message: `Could not fetch or parse feed <${url}>: ${formatError(error)}`,
      article: {},
      medium,
      feedname
    }
  }
};

/** Distinguish a failed feed fetch from a successful one, since both come back as an object. */
export const isHostError = (result: Item[] | HostError): result is HostError => !Array.isArray(result);

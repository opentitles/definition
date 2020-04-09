import Parser, { Item } from 'rss-parser';
import { HostError } from '../../domain';
const parser = new Parser({
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
      message: '',
      article: {},
      medium,
      feedname
    }
  }
};

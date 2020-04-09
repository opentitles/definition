import { Item } from 'rss-parser';

export const getRandomArticle = async (feedItems: Item[]): Promise<Item> => {
  if (!feedItems) {
    throw new Error('No feeditems passed to getRandomArticle!');
  }

  if (feedItems.length === 0) {
    throw new Error('No feeditems passed to getRandomArticle!');
  }

  const item = feedItems[Math.floor(Math.random() * feedItems.length)];
  return item;
}

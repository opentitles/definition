import { Item } from 'rss-parser';

export const getRandomArticle = (feedItems: Item[]): Item => {
  return feedItems[Math.floor(Math.random() * feedItems.length)];
}

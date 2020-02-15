import { Output } from 'rss-parser';
import { ExtendedItem } from './ExtendedItem';

export interface ExtendedOutput extends Output {
  [key: string]: any;
  image?: {
    link?: string;
    url: string;
    title?: string;
  };
  link?: string;
  title?: string;
  items: ExtendedItem[];
  feedUrl?: string;
  description?: string;
  itunes?: {
    [key: string]: any;
    image?: string;
    owner?: {
      name?: string;
      email?: string;
    };
    author?: string;
    summary?: string;
    explicit?: string;
    categories?: string[];
    keywords?: string[];
  };
}

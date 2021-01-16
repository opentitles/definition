import { Output } from 'rss-parser';
import { ExtendedItem } from './ExtendedItem';
import { ParserItemType } from './ParserItemType';

export interface ExtendedOutput extends Output<ParserItemType> {
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

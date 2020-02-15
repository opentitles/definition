import { ConfirmedItem } from './ConfirmedItem';

export interface ExtendedItem extends ConfirmedItem {
  artid: string;
  org: string;
  feedtitle: string;
  sourcefeed: string;
  lang: string;
  link: string;
  guid: string;
}

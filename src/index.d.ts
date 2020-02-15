declare type MediaDefinition = {
  feeds: FeedList;
}

declare type FeedList = {
  [key: string]: MediumDefinition[];
}

declare type MediumDefinition = {
  name: string;
  prefix: string;
  suffix: string;
  feeds: string[];
  id_container: string;
  id_mask: string;
  page_id_location: string;
  page_id_query: string;
  match_domains: string[];
  title_query: string;
}

declare type Article = {
  _id?: string;
  org: string;
  articleID: string;
  feedtitle: string;
  sourcefeed: string;
  lang: string;
  link: string;
  guid: string;
  titles: Title[];
  first_seen: string;
  pub_date: string;
}

declare type Title = {
  title: string;
  datetime: string;
  timestamp: number;
}

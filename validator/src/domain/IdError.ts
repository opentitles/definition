import { Item } from "rss-parser";

export interface IdError {
  message: string;
  article: Item;
  medium: MediumDefinition;
}
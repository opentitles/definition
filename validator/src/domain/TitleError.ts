import { Item } from "rss-parser";

export interface TitleError {
  message: string;
  article: Item;
  medium: MediumDefinition;
}
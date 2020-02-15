import { Item } from "rss-parser";

export interface HostError {
  message: string;
  article: Item;
  medium: MediumDefinition;
}
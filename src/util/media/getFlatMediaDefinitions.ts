import { readJSON } from "../files/readJSON";
import { Item } from "rss-parser";
import { flattenMediaList } from "./flattenMediaList";

export const getFlatMediaDefinition = async (): Promise<MediumDefinition[]> => {
  const media = await readJSON('media.json') as MediaDefinition;
  return flattenMediaList(media);
}
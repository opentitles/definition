import { readJSON } from '../files/readJSON.js';
import { flattenMediaList } from './flattenMediaList.js';

export const getFlatMediaDefinition = async (): Promise<MediumDefinition[]> => {
  const media = await readJSON('media.json') as MediaDefinition;
  return flattenMediaList(media);
}
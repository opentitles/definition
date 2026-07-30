import fs from 'fs/promises';

import { formatError } from '../errors/index.js';

export const readJSON = async (path: string): Promise<object> => {
  const data = await fs.readFile(path, { encoding: 'utf8' });

  try {
    return JSON.parse(data);
  } catch (error) {
    throw new Error(`Could not parse ${path} as JSON: ${formatError(error)}`);
  }
}

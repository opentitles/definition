import fs from 'fs';

export const readJSON = (path: string): Promise<object> => {
  return new Promise((resolve) => {
    fs.readFile(path, {
      encoding: 'utf8'
    }, (err, data) => {
      resolve(JSON.parse(data));
    });
  });
}
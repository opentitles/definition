import puppeteer from 'puppeteer';

export const findTitleElement = async (medium: MediumDefinition, page: puppeteer.Page): Promise<puppeteer.ElementHandle<Element> | null> => {
  return new Promise(async (resolve) => {
    for (let i = 0; i < medium.title_query.length; i++) {
      const selector = medium.title_query[i];
      const element = await page.$(selector);
      if (element) {
        resolve(element);
      }
    }

    resolve(null);
  });
};

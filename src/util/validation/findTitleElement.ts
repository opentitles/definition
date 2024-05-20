import { Page, ElementHandle } from 'puppeteer';

export const findTitleElement = async (medium: MediumDefinition, page: Page): Promise<ElementHandle<Element> | null> => {
  for (let i = 0; i < medium.title_query.length; i++) {
    const selector = medium.title_query[i];
    const element = await page.$(selector);

    if (element) {
      return element;
    }
  }

  return null;
};

import puppeteer from 'puppeteer';

/* Accept the cookies for sites that use a cookiewall */
export const cookieClicker = async (page: puppeteer.Page, medium: MediumDefinition): Promise<void> => {
  return new Promise(async (resolve) => {
    switch (medium.name) {
      case 'AD': {
        // Pass cookie checks
        if (await page.$('.button.fjs-set-consent') !== null) {
          page.click('.button.fjs-set-consent');
          await page.waitForNavigation()
        }

        resolve();
        break;
      }
    }
  });
}
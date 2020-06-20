import puppeteer from 'puppeteer';


/**
 * Accept the cookies for any sites that use a cookiewall
 * 
 * @param page Current page in puppeteer
 * @param medium Current medium being processed
 */
export const cookieClicker = async (page: puppeteer.Page, medium: MediumDefinition): Promise<void> => {
  return new Promise(async (resolve) => {
    switch (medium.name) {
      case 'AD': {
        // Pass cookie checks
        if (await page.$('.button.fjs-set-consent') !== null) {
          await page.waitForNavigation();
          await page.click('.button.fjs-set-consent');
        }

        resolve();
        break;
      }
      default: {
        resolve();
        break;
      }
    }
  });
}
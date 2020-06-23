import puppeteer from 'puppeteer';


/**
 * Accept the cookies for any sites that use a cookiewall
 * 
 * @param page Current page in puppeteer
 * @param medium Current medium being processed
 */
export const cookieClicker = async (page: puppeteer.Page, medium: MediumDefinition, retryCount = 0): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    if (retryCount > 2) {
      reject('Unacceptable cookie wall');
    }

    switch (medium.name) {
      case 'Parool':
      case 'Trouw':
      case 'Volkskrant':
      case 'AD': {
        try {
          if (await page.$('.button.fjs-set-consent') !== null) {
            await Promise.all([
              page.waitForNavigation(),
              page.click('.button.fjs-set-consent')
            ]);
          }

          resolve();
        } catch(error) {
          if (error.name === 'TimeoutError') {
            // Clicking the consent button didn't initiate navigation for whatever reason, so we're retrying here.
            const url = page.url();
            if (url.includes('myprivacy.dpgmedia.net')) {
              resolve(cookieClicker(page, medium, retryCount++));
            } else {
              resolve();
            }
          } else {
            reject();
          }
        } finally {
          break;
        }
      }
      case 'HVNL': {
        try {
          const selector = 'div.card-body.paragraph-default-black > button.component-button--primary'
          if (await page.$(selector) !== null) {
            await Promise.all([
              page.waitForNavigation(),
              page.click(selector)
            ]);
          }

          resolve();
        } catch(error) {
          if (error.name === 'TimeoutError') {
            const url = page.url();
            if (url.includes('consent.talpanetwork.com')) {
              resolve(cookieClicker(page, medium, retryCount++));
            } else {
              resolve();
            }
          } else {
            reject();
          }
        } finally {
          break;
        }
      }
      default: {
        resolve();
        break;
      }
    }
  });
}
import { retry } from 'async';
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
      // case 'Parool':
      // case 'Trouw':
      // case 'Volkskrant':
      // case 'AD': {
      //   // De Persgroep
      //   resolve(clickButtonAndRetryOnFail({
      //     selector: 'button.pg-accept-button',
      //     expectsNavigation: true, 
      //     page,
      //     medium
      //   }));
      //   break;
      // }
      case 'HVNL': {
        // Talpa
        resolve(clickButtonAndRetryOnFail({
          selector: 'div.card-body.paragraph-default-black > button.component-button--primary',
          expectsNavigation: true, 
          page,
          medium
        }));
        break;
      }
      case 'LC':
      case 'DVHN': {
        // NDC Mediagroep
        resolve(clickButtonAndRetryOnFail({
          selector: '#simple-view form > div.buttons > input',
          expectsNavigation: true, 
          page,
          medium
        }));
        break;
      }
      case 'CBS': {
        // NDC Mediagroep
        resolve(clickButtonAndRetryOnFail({
          selector: 'button#onetrust-accept-btn-handler',
          expectsNavigation: false, 
          page,
          medium
        }));
        break;
      }
      default: {
        resolve();
        break;
      }
    }
  });
}

const clickButtonAndRetryOnFail = async (
  {selector, expectsNavigation, page, medium, retryCount = 0}:
  {selector: string, expectsNavigation: boolean, page: puppeteer.Page, medium: MediumDefinition, retryCount?: number}
): Promise<void> => {
  return new Promise(async (resolve) => {
    try {
      if (await page.waitForSelector(selector, { timeout: 2000 }) !== null) {
        if (expectsNavigation) {
          page.click(selector),
          await page.waitForNavigation({waitUntil: 'domcontentloaded'})
        } else {
          await page.click(selector);
        }
      }

      resolve();
    } catch(error) {
      if ((error as Error).name === 'TimeoutError' && retryCount <= 3) {
        // Clicking the consent button didn't initiate navigation for whatever reason, so we're retrying here (up to three times before failing this medium).
        retryCount++;
        resolve(clickButtonAndRetryOnFail({
          selector,
          expectsNavigation,
          page,
          medium,
          retryCount
        }));
      } else {
        resolve();
      }
    }
  });
}
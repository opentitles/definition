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
        // De Persgroep
        resolve(clickButtonAndRetryOnFail({
          selector: '.button.fjs-set-consent',
          expectsNavigation: false, 
          page,
          medium
        }));
        break;
      }
      case 'HVNL': {
        // Talpa
        resolve(clickButtonAndRetryOnFail({
          selector: 'div.card-body.paragraph-default-black > button.component-button--primary',
          expectsNavigation: false, 
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
          expectsNavigation: false, 
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
  return new Promise(async (resolve, reject) => {
    try {
      if (await page.$(selector) !== null) {
        if (expectsNavigation) {
          await Promise.all([
            page.waitForNavigation(),
            page.click(selector)
          ]);
        } else {
          await page.click(selector);
        }
      }

      resolve();
    } catch(error) {
      if (error.name === 'TimeoutError') {
        // Clicking the consent button didn't initiate navigation for whatever reason, so we're retrying here (up to three times before failing this medium).
        resolve(clickButtonAndRetryOnFail({
          selector,
          expectsNavigation,
          page,
          medium,
          retryCount: retryCount++
        }));
      } else {
        reject();
      }
    }
  });
}
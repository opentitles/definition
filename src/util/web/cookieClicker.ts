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
      case 'NUnl':
      case 'Parool':
      case 'Trouw':
      case 'Volkskrant':
      case 'AD': {
        // De Persgroep
        resolve(clickButtonAndRetryOnFail({
          selector: 'button.pg-accept-button',
          expectsNavigation: true,
          page,
          medium
        }));
        break;
      }
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
      const button = await findInFrames(page, selector);
      if (button) {
        if (expectsNavigation) {
          button.click();
          await page.waitForNavigation({waitUntil: 'domcontentloaded'})
        } else {
          await button.click();
        }
      }

      resolve();
    } catch(error) {
      if (retryCount <= 3) {
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

async function recursiveFindInFrames(inputFrame: puppeteer.Frame, selector: string): Promise<puppeteer.ElementHandle> {
  const frames = inputFrame.childFrames();
  const results = await Promise.all(
    frames.map(async frame => {
      try {
        const el = await frame.$(selector)
        if (el) return el as puppeteer.ElementHandle<Element>
      } catch (e) {
      }

      if (frame.childFrames().length > 0) {
        return await recursiveFindInFrames(frame, selector);
      }
      return null;
    })
  );
  return results.find(Boolean) as puppeteer.ElementHandle;
}

async function findInFrames(page: puppeteer.Page, selector: string): Promise<puppeteer.ElementHandle> {
  const result = await recursiveFindInFrames(page.mainFrame(), selector);
  if (!result) {
    throw new Error(
      `The selector \`${selector}\` could not be found in any child frames.`
    );
  }
  return result;
}

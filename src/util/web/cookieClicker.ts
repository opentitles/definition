import { Page, Frame, ElementHandle } from 'puppeteer';
import { milliseconds } from '@fdebijl/pog';

import { CONFIG } from '../../config';

/**
 * Accept the cookies for any sites that use a cookiewall
 *
 * @param page Current page in puppeteer
 * @param medium Current medium being processed
 */
export const cookieClicker = async (page: Page, medium: MediumDefinition, retryCount = 0): Promise<void> => {
  if (retryCount > 2) {
    throw new Error('Unacceptable cookie wall');
  }

  switch (medium.name) {
    case 'NUnl':
    case 'Volkskrant':
    case 'AD': {
      // DPG
      return clickButtonAndRetryOnFail({
        selector: 'button.pg-accept-button',
        expectsNavigation: true,
        page,
        medium
      });
    }
    case 'Trouw':
    case 'Parool': {
      // DPG with isBot cookie
      await page.reload();
      break;
    }
    case 'HVNL': {
      // Talpa
      return clickButtonAndRetryOnFail({
        selector: 'div.card-body.paragraph-default-black > button.component-button--primary',
        expectsNavigation: true,
        page,
        medium
      });
    }
    case 'LC':
    case 'DVHN': {
      // NDC Mediagroep
      return clickButtonAndRetryOnFail({
        selector: '#simple-view form > div.buttons > input',
        expectsNavigation: true,
        page,
        medium
      });
    }
  }
}

const clickButtonAndRetryOnFail = async (
  {selector, expectsNavigation, page, medium, retryCount = 0}:
  {selector: string, expectsNavigation: boolean, page: Page, medium: MediumDefinition, retryCount?: number}
): Promise<void> => {
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
  } catch(error) {
    if (retryCount <= 3) {
      // Clicking the consent button didn't initiate navigation for whatever reason, so we're retrying here (up to three times before failing this medium).
      retryCount++;

      await milliseconds(CONFIG.TIMEOUT.COOKIECLICKER_RETRY);

      return clickButtonAndRetryOnFail({
        selector,
        expectsNavigation,
        page,
        medium,
        retryCount
      });
    }
  }
}

async function recursiveFindInFrames(inputFrame: Frame, selector: string): Promise<ElementHandle> {
  const frames = inputFrame.childFrames();
  const results = await Promise.all(
    frames.map(async frame => {
      try {
        const el = await frame.$(selector)
        if (el) return el as ElementHandle<Element>
      } catch (e) {
        // console.error(e);
      }

      if (frame.childFrames().length > 0) {
        return recursiveFindInFrames(frame, selector);
      }

      return null;
    })
  );
  return results.find(Boolean) as ElementHandle;
}

async function findInFrames(page: Page, selector: string): Promise<ElementHandle> {
  const result = await recursiveFindInFrames(page.mainFrame(), selector);
  if (!result) {
    throw new Error(`The selector \`${selector}\` could not be found in any child frames.`);
  }
  return result;
}

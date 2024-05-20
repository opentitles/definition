import { Item } from 'rss-parser';
import pextra from 'puppeteer-extra';
import { milliseconds } from '@fdebijl/pog';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import { TitleError, IdError, HostError } from '../../domain';
import { cookieClicker } from '../web/cookieClicker';
import { findTitleElement } from './findTitleElement';

export const validateArticle = async (article: Item, medium: MediumDefinition, feedname: string): Promise<{hostError?: HostError, titleError?: TitleError, idError?: IdError}> => {
  if (!article) {
    return {};
  }

  // TODO: Add catch for problems with launching puppeteer
  pextra.use(StealthPlugin());
  const browser = await pextra.launch({
    headless: true,
    ignoreHTTPSErrors: true
  });
  const page = await browser.newPage();
  const link: string | undefined = article.link || article.guid || undefined;

  // Verify host can be reached
  // Host errors preclude any further checks so we can return early
  try {
    if (!link) {
      return {
        hostError: {
          message: `Could not connect to [${medium.name}: ${article.title}]: no link or GUID in article`,
          article,
          medium,
          feedname
        }
      }
    }

    const response = await page.goto(link);
    const statusCode = response?.status();

    if (statusCode) {
      if (statusCode >= 400) {
        await browser.close();
        return {
          hostError: {
            message: `Could not connect to <${link}>: server returned ${statusCode}`,
            article,
            medium,
            feedname
          }
        }
      }
    }
  } catch (err) {
    return {
      hostError: {
        message: `Could not connect to <${link}>: \n${err}`,
        article,
        medium,
        feedname
      }
    }
  }

  // Make a best-effort attempt to bypass any cookie walls
  // Fails silently
  await cookieClicker(page, medium);

  let titleError: TitleError | undefined = undefined;
  let idError: IdError | undefined  = undefined;

  // Verify page has accessible ID
  const url = page.url();

  switch (medium.page_id_location) {
    case 'var': {
      try {
        const id = await page.evaluate((injectedMedium: MediumDefinition) => {
          return new Promise((resolve) => {
            let out: any = window;
            const locations = injectedMedium.page_id_query.split('.');
            locations.forEach(location => {
              out = out[location];
            });

            resolve(out);
          });
        }, medium);
        if (!id) {
          idError = {
            message: `No match for ID on <${url}> using path to window variable [${medium.page_id_query}]`,
            article,
            medium,
            feedname
          }
        }
      } catch (err) {
        // Most likely a type error because the path to var is broken
        idError = {
          message: `No match for ID on <${url}> using path to window variable [${medium.page_id_query}]`,
          article,
          medium,
          feedname
        }
      }
      break;
    }
    case 'url': {
      if (!url.match(medium.id_mask)) {
        idError = {
          message: `No match for ID in <${url}> using mask [${medium.id_mask}]`,
          article,
          medium,
          feedname
        }
      }
      break;
    }
    case 'element_textcontent': {
      const idElement = await page.$(medium.page_id_query);

      if (!idElement) {
        idError = {
          message: `No element for ID on <${url}> using selector [${medium.page_id_query}]`,
          article,
          medium,
          feedname
        }
      } else {
        const text = await page.evaluate(injectedIdElement => injectedIdElement.textContent, idElement);

        if (!text) {
          idError = {
            message: `No text content for ID element on <${url}> using selector [${medium.page_id_query}]`,
            article,
            medium,
            feedname
          }
        }

        if (!text?.match(medium.id_mask)) {
          idError = {
            message: `No match for ID in <${url}> using mask [${medium.id_mask}] on string [${text}]`,
            article,
            medium,
            feedname
          }
        }
      }

      break;
    }
    case 'element_href': {
      const idElement = await page.$(medium.page_id_query);

      if (!idElement) {
        idError = {
          message: `No element for ID on <${url}> using selector [${medium.page_id_query}]`,
          article,
          medium,
          feedname
        }
      } else {
        const href = await page.evaluate(injectedIdElement => injectedIdElement.getAttribute('href'), idElement);

        if (!href) {
          idError = {
            message: `No href attribute for ID element on <${url}> using selector [${medium.page_id_query}]`,
            article,
            medium,
            feedname
          }
        }
      }

      break;
    }
    default: {
      idError = {
        message: `No valid ID location specified for <${url}>`,
        article,
        medium,
        feedname
      }
    }
  }

  // Verify title is present on page and matches that from the RSS feed
  const titleElement = await findTitleElement(medium, page);

  if (!titleElement) {
    titleError = {
      message: `Title element could not be found on <${url}> using selectors [${medium.title_query}]`,
      article,
      medium,
      feedname
    }
  } else {
    // Skipping this test for now, it's very inconsistent
    //
    // const text = await page.evaluate(titleElement => titleElement.textContent, titleElement);
    // if (text.trim() !== article.title?.trim()) {
    //   titleError = {
    //     message: `Title on page [${text}] did not match title from RSS feed [${article.title}]`,
    //     article,
    //     medium,
    //     feedname
    //   }
    // }
  }

  await milliseconds(500);
  await browser.close();

  return {
    titleError,
    idError
  }
}

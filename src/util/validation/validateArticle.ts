import { Item } from 'rss-parser';
import { Browser } from 'puppeteer';
// puppeteer-extra is CJS: importing it from ESM yields the module.exports object,
// so the PuppeteerExtra instance has to be taken off its `default` key.
import puppeteerExtra from 'puppeteer-extra';
import { milliseconds } from '@fdebijl/pog';
import { Clog, LOGLEVEL } from '@fdebijl/clog';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import { TitleError, IdError, HostError } from '../../domain/index.js';
import { cookieClicker } from '../web/cookieClicker.js';
import { formatError } from '../errors/index.js';
import { findTitleElement } from './findTitleElement.js';

const clog = new Clog();

// Register the plugin once instead of on every article - puppeteer-extra keeps a single
// plugin registry for the whole process.
const pextra = puppeteerExtra.default;
pextra.use(StealthPlugin());

const launchBrowser = (): Promise<Browser> => pextra.launch({
  headless: true,
  acceptInsecureCerts: true,
  // Chrome's sandbox can't be set up in most CI containers (no unprivileged user namespaces),
  // where launching would otherwise fail for every single medium.
  args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : []
});

export const validateArticle = async (article: Item, medium: MediumDefinition, feedname: string): Promise<{hostError?: HostError, titleError?: TitleError, idError?: IdError}> => {
  if (!article) {
    return {};
  }

  const link: string | undefined = article.link || article.guid || undefined;

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

  let browser: Browser;

  try {
    browser = await launchBrowser();
  } catch (error) {
    // Without a browser nothing can be validated, so this has to be reported instead of thrown
    // into the void - it's the failure mode that takes down an entire run at once.
    return {
      hostError: {
        message: `Could not launch a browser to validate <${link}>: ${formatError(error)}`,
        article,
        medium,
        feedname
      }
    }
  }

  try {
    const page = await browser.newPage();

    // Verify host can be reached
    // Host errors preclude any further checks so we can return early
    try {
      await page.setCookie({
        // Cookiebot consent
        name: 'cookieconsent_status',
        value: 'dismiss',
        domain: new URL(link).hostname,
        path: '/'
      },
      {
        // DPG allows bot to bypass the cookie wall
        name: 'isBot',
        value: 'true',
        domain: new URL(link).hostname,
        path: '/',
        httpOnly: false,
        secure: false
      });

      const response = await page.goto(link);
      const statusCode = response?.status();

      if (statusCode) {
        if (statusCode >= 400) {
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
          message: `Could not connect to <${link}>: \n${formatError(err)}`,
          article,
          medium,
          feedname
        }
      }
    }

    // Make a best-effort attempt to bypass any cookie walls
    // Logs but doesn't throw when it can't get past the wall
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
            message: `No match for ID on <${url}> using path to window variable [${medium.page_id_query}]: ${formatError(err)}`,
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

    return {
      titleError,
      idError
    }
  } finally {
    // Every exit from this function has to close the browser, otherwise a run leaks a Chrome
    // process per article until later launches start failing.
    try {
      await browser.close();
    } catch (error) {
      clog.log(`Could not close the browser after validating <${link}>: ${formatError(error)}`, LOGLEVEL.WARN);
    }
  }
}

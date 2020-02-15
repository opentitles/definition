import { Item } from 'rss-parser';
import puppeteer from 'puppeteer';
import { TitleError, IdError, HostError } from '../../domain';

export const validateArticle = async (article: Item, medium: MediumDefinition): Promise<{hostError?: HostError, titleError?: TitleError, idError?: IdError}> => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    isMobile: false
  });

  // Verify host can be reached
  // Host errors preclude any further checks so we can return early
  try {
    const response = await page.goto(article.link as string);
    const statusCode = await response?.status();
  
    if (statusCode) {
      if (statusCode >= 400) {
        await browser.close();
        return {
          hostError: {
            message: `Could not connect to [${article.link as string}]: server returned ${statusCode}`,
            article,
            medium
          }
        }
      }
    }
  } catch (err) {
    return {
      hostError: {
        message: `Could not connect to [${article.link as string}]: \n${err}`,
        article,
        medium
      }
    }
  }

  let titleError: TitleError | undefined = undefined;
  let idError: IdError | undefined  = undefined;

  // Verify page has accessible ID
  const url = await page.url();
  switch (medium.page_id_location) {
    case ('var'): {
      try {
        const id = await page.evaluate((medium: MediumDefinition) => {
          return new Promise((resolve) => {
            let out: any = window;
            const locations = medium.page_id_query.split('.');
            locations.forEach(location => {
              out = out[location];
            });

            resolve(out);
          });
        });
        if (!id) {
          idError = {
            message: `No match for ID on [${url}] using path to window variable [${medium.page_id_query}]`,
            article,
            medium
          }
        }
      } catch (err) {
        // Most likely a type error because the path to var is broken
        idError = {
          message: `No match for ID on [${url}] using path to window variable [${medium.page_id_query}]`,
          article,
          medium
        }
      }
      break;
    };
    case ('url'): {
      if (!url.match(medium.id_mask)) {
        idError = {
          message: `No match for ID in [${url}] using mask [${medium.id_mask}]`,
          article,
          medium
        }
      }
      break;
    }
  }

  // Verify title is present on page and matches that from the RSS feed
  const titleElement = await page.$(medium.title_query);
  if (!titleElement) {
    titleError = {
      message: `Title element could not be found on [${url}] using selector [${medium.title_query}]`,
      article,
      medium
    }
  } else {
    const text = await page.evaluate(titleElement => titleElement.textContent, titleElement);
    if (text.trim() !== article.title?.trim()) {
      titleError = {
        message: `Title on page [${text}] did not match title from RSS feed [${article.title}]`,
        article,
        medium
      }
    }
  }

  await browser.close();

  return {
    titleError,
    idError
  }
}
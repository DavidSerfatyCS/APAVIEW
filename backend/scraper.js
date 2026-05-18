const { chromium } = require('playwright');

const MAX_CONCURRENT = 2;
let browserPromise = null;
let activeScrapes = 0;
const queue = [];
let idleTimer = null;

const EMPTY_RESULT = () => ({ title: null, price: null, location: null, photos: [], features: {} });

// Close browser after 60s with no active scrapes (saves memory on Railway free tier)
function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    if (activeScrapes === 0 && browserPromise) {
      const closing = browserPromise;
      browserPromise = null; // null before await so incoming callers re-launch immediately
      const b = await closing.catch(() => null);
      if (b) await b.close().catch(() => {});
    }
  }, 60_000);
}

async function getBrowser() {
  if (!browserPromise) {
    // Store the promise, not the resolved value — prevents two concurrent callers from each launching a browser
    browserPromise = chromium.launch({ headless: true }).catch((err) => {
      browserPromise = null;
      throw err;
    });
  }
  resetIdleTimer();
  return browserPromise;
}

function withScrapeSlot(fn) {
  return new Promise((resolve, reject) => {
    async function tryRun() {
      if (activeScrapes >= MAX_CONCURRENT) {
        queue.push(tryRun);
        return;
      }
      activeScrapes++;
      try {
        resolve(await fn());
      } catch (err) {
        reject(err);
      } finally {
        activeScrapes--;
        const next = queue.shift();
        if (next) next();
        if (activeScrapes === 0) resetIdleTimer();
      }
    }
    tryRun();
  });
}

async function scrapeYad2(url, page) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for content to render (JS-heavy site)
  await page.waitForTimeout(2000);

  const data = await page.evaluate(() => {
    function text(selectors) {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim()) return el.innerText.trim();
      }
      return null;
    }

    const title = text([
      'h1',
      '[class*="title"]',
      '[data-testid="ad-title"]',
      '.main-title',
    ]);

    const price = text([
      '[class*="price"]',
      '[data-testid="price"]',
      '.price',
      '[class*="Price"]',
    ]);

    const location = text([
      '[class*="location"]',
      '[class*="address"]',
      '[class*="neighborhood"]',
      '[data-testid="address"]',
      '.address',
    ]);

    const imgEls = Array.from(document.querySelectorAll(
      'img[src*="yad2"], img[src*="cdn"], img[src*="image"], [class*="gallery"] img, [class*="slider"] img'
    ));
    const photos = [...new Set(
      imgEls
        .map((img) => img.src || img.getAttribute('data-src'))
        .filter((src) => src && src.startsWith('http') && !src.includes('icon') && !src.includes('logo'))
    )].slice(0, 6);

    const featureEls = Array.from(document.querySelectorAll(
      '[class*="tag"], [class*="feature"], [class*="attribute"], [class*="detail"]'
    ));
    const featureTexts = featureEls
      .map((el) => el.innerText.trim())
      .filter((t) => t && t.length < 40);

    const features = {};
    const KNOWN = {
      'מרפסת': 'balcony',
      'חניה': 'parking',
      'מרוהט': 'furnished',
      'מעלית': 'elevator',
      'ממוזג': 'ac',
      'שומר': 'security',
      'גינה': 'garden',
    };
    featureTexts.forEach((t) => {
      for (const [heb, eng] of Object.entries(KNOWN)) {
        if (t.includes(heb)) features[eng] = true;
      }
    });

    const bodyText = document.body.innerText;
    const roomsMatch = bodyText.match(/(\d[\d.]*)\s*(חד|חדר)/);
    if (roomsMatch) features.rooms = roomsMatch[1];
    const sizeMatch = bodyText.match(/(\d+)\s*מ["״]ר/);
    if (sizeMatch) features.size = `${sizeMatch[1]}m²`;

    return { title, price, location, photos, features };
  });

  return data;
}

async function scrapeApartment(url) {
  return withScrapeSlot(async () => {
    const b = await getBrowser();
    const context = await b.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'he-IL',
    });
    const page = await context.newPage();

    try {
      let scraped = EMPTY_RESULT();
      if (url.includes('yad2.co.il')) {
        scraped = await scrapeYad2(url, page);
      }
      return scraped;
    } catch (err) {
      console.error(`Scraping failed for ${url}:`, err.message);
      return EMPTY_RESULT();
    } finally {
      await context.close();
    }
  });
}

module.exports = { scrapeApartment };

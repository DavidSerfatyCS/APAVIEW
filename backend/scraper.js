const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

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

// Walk dehydratedState.queries[] and return the first one whose .state.data looks like the
// listing item (has adNumber/token + price). The order/index isn't stable across page versions.
function findItemData(nextData) {
  const queries = nextData?.props?.pageProps?.dehydratedState?.queries;
  if (!Array.isArray(queries)) return null;
  for (const q of queries) {
    const d = q?.state?.data;
    if (d && typeof d === 'object' && ('adNumber' in d || 'token' in d) && 'price' in d) {
      return d;
    }
  }
  return null;
}

function buildLocation(address) {
  if (!address) return null;
  const parts = [];
  const street = address.street?.text;
  const houseNum = address.house?.number;
  if (street) parts.push(houseNum ? `${street} ${houseNum}` : street);
  if (address.neighborhood?.text) parts.push(address.neighborhood.text);
  if (address.city?.text) parts.push(address.city.text);
  return parts.length ? parts.join(', ') : null;
}

function buildTitle(data) {
  const prop = data?.additionalDetails?.property?.text || 'דירה';
  const rooms = data?.additionalDetails?.roomsCount;
  const city = data?.address?.city?.text;
  const neighborhood = data?.address?.neighborhood?.text;
  const where = [neighborhood, city].filter(Boolean).join(', ');
  const roomsStr = rooms ? `${rooms} חד'` : '';
  return [prop, roomsStr, where].filter(Boolean).join(' · ') || null;
}

function buildFeatures(data) {
  const features = {};
  const ad = data?.additionalDetails || {};
  const ip = data?.inProperty || {};

  if (ad.roomsCount != null) features.rooms = String(ad.roomsCount);
  if (ad.squareMeter != null) features.size = `${ad.squareMeter}m²`;
  const floor = data?.address?.house?.floor;
  if (floor != null) features.floor = String(floor);
  if (ip.includeBalcony) features.balcony = true;
  if (ip.includeParking) features.parking = true;
  if (ip.includeFurniture) features.furnished = true;
  if (ip.includeElevator) features.elevator = true;
  if (ip.includeAirconditioner) features.ac = true;
  if (ip.includeSecurityRoom) features.security = true;
  if (ip.isRenovated) features.renovated = true;
  if (ip.isPetsAllowed) features.pets = true;
  return features;
}

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
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const status = resp?.status();
  if (status && status >= 400) {
    throw new Error(`HTTP ${status} from Yad2`);
  }

  await page.waitForSelector('#__NEXT_DATA__', { state: 'attached', timeout: 15000 });

  const raw = await page.evaluate(() => {
    const el = document.getElementById('__NEXT_DATA__');
    return el ? el.textContent : null;
  });
  if (!raw) throw new Error('__NEXT_DATA__ not found');

  const nextData = JSON.parse(raw);
  const data = findItemData(nextData);
  if (!data) throw new Error('item data not found in __NEXT_DATA__');

  const photos = Array.isArray(data?.metaData?.images) ? data.metaData.images.slice(0, 12) : [];
  const price = typeof data.price === 'number' ? `${data.price.toLocaleString('he-IL')} ₪` : null;

  return {
    title: buildTitle(data),
    price,
    location: buildLocation(data.address),
    photos,
    features: buildFeatures(data),
  };
}

async function scrapeApartment(url) {
  return withScrapeSlot(async () => {
    const b = await getBrowser();
    const context = await b.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'he-IL',
      viewport: { width: 1366, height: 900 },
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

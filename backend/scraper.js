const { chromium } = require('playwright');

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

    // Title
    const title = text([
      'h1',
      '[class*="title"]',
      '[data-testid="ad-title"]',
      '.main-title',
    ]);

    // Price
    const price = text([
      '[class*="price"]',
      '[data-testid="price"]',
      '.price',
      '[class*="Price"]',
    ]);

    // Location / neighborhood
    const location = text([
      '[class*="location"]',
      '[class*="address"]',
      '[class*="neighborhood"]',
      '[data-testid="address"]',
      '.address',
    ]);

    // Photos — collect unique src values from gallery images
    const imgEls = Array.from(document.querySelectorAll(
      'img[src*="yad2"], img[src*="cdn"], img[src*="image"], [class*="gallery"] img, [class*="slider"] img'
    ));
    const photos = [...new Set(
      imgEls
        .map((img) => img.src || img.getAttribute('data-src'))
        .filter((src) => src && src.startsWith('http') && !src.includes('icon') && !src.includes('logo'))
    )].slice(0, 6);

    // Features — look for tag/feature elements
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

    // Try to extract rooms and size from text on page
    const bodyText = document.body.innerText;
    const roomsMatch = bodyText.match(/(\d[\d.]*)\s*(חד|חדר)/);
    if (roomsMatch) features.rooms = roomsMatch[1];
    const sizeMatch = bodyText.match(/(\d+)\s*מ"ר/);
    if (sizeMatch) features.size = `${sizeMatch[1]}m²`;

    return { title, price, location, photos, features };
  });

  return data;
}

async function scrapeApartment(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'he-IL',
  });
  const page = await context.newPage();

  try {
    let scraped = { title: null, price: null, location: null, photos: [], features: {} };

    if (url.includes('yad2.co.il')) {
      scraped = await scrapeYad2(url, page);
    }
    // Future: add scrapers for other platforms here

    return { url, ...scraped };
  } catch (err) {
    console.error(`Scraping failed for ${url}:`, err.message);
    return { url, title: null, price: null, location: null, photos: [], features: {} };
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeApartment };

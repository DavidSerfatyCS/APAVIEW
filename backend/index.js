require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getApartments, createApartment, updateApartment } = require('./db');
const { scrapeApartment } = require('./scraper');

const app = express();
app.use(cors());
app.use(express.json());

// Track which IDs are currently being scraped — no DB column needed
const scrapingIds = new Set();

app.get('/api/apartments', async (req, res) => {
  try {
    const data = await getApartments();
    // Merge scraping state from memory into each record
    const withScraping = data.map((a) => ({ ...a, scraping: scrapingIds.has(a.id) }));
    res.json(withScraping);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/apartments', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  try {
    const record = await createApartment({ url });
    scrapingIds.add(record.id);
    res.status(201).json({ ...record, scraping: true });

    // Scrape in the background — don't block the response
    scrapeApartment(url)
      .then((scraped) => updateApartment(record.id, scraped))
      .catch((err) => console.error('Background scrape failed:', err.message))
      .finally(() => scrapingIds.delete(record.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/apartments/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const valid = ['pending', 'interested', 'discarded'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
  }
  try {
    const record = await updateApartment(id, { status });
    res.json({ ...record, scraping: scrapingIds.has(id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));

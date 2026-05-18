require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getApartments, createApartment, updateApartment } = require('./db');
const { scrapeApartment } = require('./scraper');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/apartments', async (req, res) => {
  try {
    const data = await getApartments();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/apartments', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  try {
    // Save immediately so the card appears on the board right away
    const record = await createApartment({ url, scraping: true });
    res.status(201).json(record);

    // Scrape in the background — don't block the response
    scrapeApartment(url)
      .then((scraped) => updateApartment(record.id, { ...scraped, scraping: false }))
      .catch((err) => {
        console.error('Background scrape failed:', err.message);
        updateApartment(record.id, { scraping: false }).catch(() => {});
      });
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
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));

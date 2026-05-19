require('dotenv').config();
const express = require('express');
const cors = require('cors');
const {
  getApartments,
  getApartment,
  createApartment,
  updateApartment,
  deleteApartment,
  upsertVote,
  deleteVote,
  getCommentsByApartment,
  createComment,
  deleteComment,
} = require('./db');
const { scrapeApartment } = require('./scraper');

const app = express();

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
app.use(cors(ALLOWED_ORIGIN ? { origin: ALLOWED_ORIGIN } : {}));
app.use(express.json());

const VALID_USERS = ['Adam', 'Abi', 'David'];
const VALID_VOTES = ['yes', 'no', 'maybe'];

// Track which IDs are currently being scraped — no DB column needed
const scrapingIds = new Set();

app.get('/api/apartments', async (req, res) => {
  try {
    const data = await getApartments();
    const withScraping = data.map((a) => ({ ...a, scraping: scrapingIds.has(a.id) }));
    res.json(withScraping);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function kickOffScrape(id, url) {
  scrapingIds.add(id);
  scrapeApartment(url)
    .then((scraped) => updateApartment(id, scraped))
    .catch((err) => console.error('Background scrape failed:', err.message))
    .finally(() => scrapingIds.delete(id));
}

app.post('/api/apartments', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  let parsed;
  try { parsed = new URL(url); } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ error: 'URL must use http or https' });
  }

  try {
    const record = await createApartment({ url });
    res.status(201).json({ ...record, scraping: true });
    kickOffScrape(record.id, url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/apartments/:id/rescrape', async (req, res) => {
  const { id } = req.params;
  try {
    const record = await getApartment(id);
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json({ ...record, scraping: true });
    kickOffScrape(record.id, record.url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/apartments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await deleteApartment(id);
    scrapingIds.delete(id);
    res.status(204).end();
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

// ─── Votes ────────────────────────────────────────────────────

app.post('/api/apartments/:id/votes', async (req, res) => {
  const { id } = req.params;
  const { user_name, vote } = req.body;
  if (!VALID_USERS.includes(user_name)) {
    return res.status(400).json({ error: `user_name must be one of: ${VALID_USERS.join(', ')}` });
  }
  if (!VALID_VOTES.includes(vote)) {
    return res.status(400).json({ error: `vote must be one of: ${VALID_VOTES.join(', ')}` });
  }
  try {
    const record = await upsertVote(id, user_name, vote);
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/apartments/:id/votes/:userName', async (req, res) => {
  const { id, userName } = req.params;
  if (!VALID_USERS.includes(userName)) {
    return res.status(400).json({ error: `userName must be one of: ${VALID_USERS.join(', ')}` });
  }
  try {
    await deleteVote(id, userName);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Comments ─────────────────────────────────────────────────

app.get('/api/apartments/:id/comments', async (req, res) => {
  const { id } = req.params;
  try {
    const data = await getCommentsByApartment(id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/apartments/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { user_name, text } = req.body;
  if (!VALID_USERS.includes(user_name)) {
    return res.status(400).json({ error: `user_name must be one of: ${VALID_USERS.join(', ')}` });
  }
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }
  try {
    const record = await createComment(id, user_name, text.trim());
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/apartments/:id/comments/:commentId', async (req, res) => {
  const { commentId } = req.params;
  try {
    await deleteComment(commentId);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));

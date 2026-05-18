# ApartaView — Context Handoff

> Paste this file into a new Claude Code session along with the files in `guide/` to resume with full context.

---

## What this app is

Shared apartment-hunting dashboard. A group of friends paste Yad2 links into a shared board. The app scrapes each listing automatically and shows cards with photos, price, location, and features. Everyone sees updates in real time via Supabase Realtime. Cards can be marked Pendiente / Interesado / Descartado.

**Stack:** React + Tailwind + Vite (frontend) / Express + Playwright (backend) / Supabase Postgres + Realtime / Vercel + Railway (deploy)

---

## Current state: WORKING except scraper

- App is fully built and running locally
- Supabase is connected and tested (INSERT/DELETE verified)
- All code review bugs have been fixed (see below)
- The UI, filters, sort, status cycling, real-time sync — all working
- **The Yad2 scraper does not work** — this is the #1 priority

---

## What has already been fixed (don't redo these)

All bugs from a full code review were resolved in this session:

| Area | Fix |
|------|-----|
| `scraper.js` | Browser singleton + semaphore (was: new browser per request) |
| `scraper.js` | Promise-based `getBrowser()` to prevent TOCTOU launch race |
| `scraper.js` | Idle timer nulls promise before `await close()` to prevent race |
| `scraper.js` | `EMPTY_RESULT` factory hoisted (was: duplicated literal) |
| `index.js` | CORS restricted to `ALLOWED_ORIGIN` env var |
| `index.js` | URL validated with `new URL()` + protocol check |
| `index.js` | `url` field stripped from scrape payload before DB update |
| `db.js` | `require('crypto')` moved to top-level import |
| `db.js` | `supabase` removed from exports (internal detail) |
| `ApartmentCard.jsx` | `onError` uses React state instead of DOM mutation |
| `ApartmentCard.jsx` | Photo index and error state reset on apartment change |
| `Board.jsx` | Polling gated with `if (!supabase)` — no double-updates with Realtime |
| `Board.jsx` | `filtered`, `sorted`, `scrapingCount` wrapped in `useMemo` |
| `Board.jsx` | `parsePrice(s, fallback)` helper extracted — was copy-pasted 4× |
| `AddLinkForm.jsx` | Flash timeout stored in ref, cleaned up on unmount |
| All components | `API` constant centralized in `src/lib/config.js` |
| `README.md` | SQL schema now has `CHECK (status IN (...))` constraint |

---

## #1 Priority: Fix Yad2 scraper

### Why it fails

1. **Cloudflare blocks it** — Playwright exposes `navigator.webdriver = true`, which Cloudflare reads immediately
2. **Wrong extraction strategy** — current selectors like `[class*="price"]` are guesses; Yad2 class names are minified/hashed and change constantly

### The right approach

Yad2 is a Next.js app. All listing data is embedded in the HTML as:
```html
<script id="__NEXT_DATA__" type="application/json">{ ...all data... }</script>
```

This gives clean structured JSON with price, rooms, size, images, location — no CSS guessing needed.

For Cloudflare bypass, use `playwright-extra` + `puppeteer-extra-plugin-stealth`:
```bash
cd backend && npm install playwright-extra puppeteer-extra-plugin-stealth
```

### Key unknowns to verify with a real URL

- Exact path inside `__NEXT_DATA__` to the item data (likely `props.pageProps.item` but must verify)
- Whether stealth is enough or if Cloudflare still blocks datacenter IPs (Railway risk)
- Image URL format in the JSON

### Honest risk

- Local development: high chance of working (home IP not flagged)
- Railway (production): datacenter IPs may be pre-blocked by Cloudflare regardless of stealth. If so, the only fix is a residential proxy service (costs ~$10-30/month)

### Current scraper file
`backend/scraper.js` — the `scrapeYad2` function and `scrapeApartment` are the targets.

---

## Remaining features to build

In priority order:

### 1. Fix Yad2 scraper (see above)

### 2. Delete apartment
- `DELETE /api/apartments/:id` endpoint in `backend/index.js`
- Trash icon button on `ApartmentCard.jsx`
- Remove from state in `Board.jsx`

### 3. Scraping failure UX
When scraping finishes but all fields are null (e.g. Cloudflare blocked it), the card just shows blank — user has no idea. Need a `failed` status or detect `title === null && price === null && photos.length === 0` after scraping completes, and show a "No se pudo obtener datos" state with a retry button.

### 4. Notes field
Add a text note per card saved to Supabase. Requires:
- New `notes TEXT` column in Supabase (ALTER TABLE or recreate)
- `PATCH /api/apartments/:id` already accepts arbitrary fields, so backend is already ready
- Inline editable textarea on the card

---

## Architecture notes

### Async scrape flow
```
POST /api/apartments
  → createApartment({url}) → DB insert
  → return {record, scraping: true} immediately
  → scrapeApartment(url) runs in background
  → updateApartment(id, scrapedData) on finish
  → scrapingIds.delete(id)
```

`scraping` flag is NOT in the DB — it lives in a `Set` in server memory, merged into GET responses. This means scraping state resets on server restart (acceptable).

### Realtime sync
When Supabase is connected: Realtime events trigger `fetchApartments()` from the API (not from payload directly — because `scraping` flag is server-side memory, not in DB).
When no Supabase: polls every 3s while any card has `scraping: true`.

### In-memory fallback
`db.js` works without Supabase credentials (data lost on restart). Good for local dev without setup.

---

## File structure
```
APAVIEW/
├── backend/
│   ├── index.js      ← Express API (3 endpoints)
│   ├── scraper.js    ← Playwright scraper — THIS IS THE MAIN PROBLEM
│   ├── db.js         ← Supabase client + in-memory fallback
│   └── .env          ← SUPABASE_URL, SUPABASE_ANON_KEY, PORT=3001
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── lib/
    │   │   ├── config.js    ← API base URL
    │   │   └── supabase.js  ← Supabase client (null if no credentials)
    │   └── components/
    │       ├── AddLinkForm.jsx
    │       ├── ApartmentCard.jsx
    │       └── Board.jsx
    └── .env           ← VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
```

---

## To run locally
```bash
# Backend
cd backend && npm start      # http://localhost:3001

# Frontend
cd frontend && npm run dev   # http://localhost:5173
```

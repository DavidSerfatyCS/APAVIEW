# ApartaView

Dashboard compartido para buscar apartamentos en grupo. Los miembros agregan links de Yad2 (vía bookmarklet) o Facebook, la app scrapea el anuncio y todos ven las cards en tiempo real vía Supabase Realtime.

---

## Requisitos

- Node.js 18+
- Una cuenta en [supabase.com](https://supabase.com) (gratis)

---

## Configurar Supabase

### 1. Crear el proyecto

Entra a [supabase.com](https://supabase.com), crea un nuevo proyecto y espera a que inicialice.

### 2. Crear las tablas

En el **SQL Editor** de tu proyecto, pega y ejecuta:

```sql
CREATE TABLE apartments (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  url         TEXT        NOT NULL,
  title       TEXT,
  price       TEXT,
  location    TEXT,
  photos      TEXT[],
  features    JSONB,
  status      TEXT        DEFAULT 'pending'
                CHECK (status IN ('pending', 'interested', 'contacted', 'discarded')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE votes (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  apartment_id UUID        NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  user_name    TEXT        NOT NULL CHECK (user_name IN ('Adam', 'Abi', 'David')),
  vote         TEXT        NOT NULL CHECK (vote IN ('yes', 'no', 'maybe')),
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (apartment_id, user_name)
);

CREATE TABLE comments (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  apartment_id UUID        NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  user_name    TEXT        NOT NULL CHECK (user_name IN ('Adam', 'Abi', 'David')),
  text         TEXT        NOT NULL CHECK (length(trim(text)) > 0),
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_votes_apartment     ON votes(apartment_id);
CREATE INDEX idx_comments_apartment  ON comments(apartment_id);
```

### 3. Activar Realtime

En **Table Editor → Realtime toggle** → activar para las 3 tablas: `apartments`, `votes`, `comments`.

### 4. Copiar las credenciales

En **Project Settings → API**, copia:
- **Project URL** → `SUPABASE_URL`
- **anon / public key** → `SUPABASE_ANON_KEY`

---

## Setup local

### Backend

```bash
cd backend
cp .env.example .env
# Edita .env con tus credenciales de Supabase
npm install
npm start
# → http://localhost:3001
```

### Frontend

```bash
cd frontend
cp .env.example .env
# Edita .env con las mismas credenciales + la URL del backend
npm install
npm run dev
# → http://localhost:5173
```

**Variables del frontend (`.env`):**

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...
VITE_API_URL=http://localhost:3001
```

---

## Usar la app

### Agregar anuncios de Yad2

Yad2 bloquea scrapers desde IPs de datacenter. El scraping se hace en el navegador del usuario vía bookmarklet:

1. Abre `http://localhost:5173/bookmarklet.html` (o la URL de producción)
2. Arrastra el botón **🏠 APAVIEW** a tu barra de favoritos (una sola vez)
3. En cualquier anuncio de Yad2, haz clic en **🏠 APAVIEW** → ApaView se abre con el apartamento ya agregado

### Agregar anuncios de Facebook

Pega el link directamente en el campo de texto → la app lo scrapea server-side vía OG meta tags.

### Gestionar el board

- Click en el badge de estado para ciclar: **Pendiente → Interesado → Contactado → Descartado**
- Filtra por estado y ordena por precio o fecha
- Modo comparación: selecciona varias cards para verlas lado a lado

---

## Estructura del proyecto

```
APAVIEW/
├── backend/
│   ├── index.js      ← Express API (apartments, votes, comments)
│   ├── scraper.js    ← Facebook scraper + parseYad2Item() para el bookmarklet
│   ├── db.js         ← Supabase client + fallback en memoria
│   └── .env          ← SUPABASE_URL, SUPABASE_ANON_KEY, PORT, ALLOWED_ORIGIN
└── frontend/
    ├── public/
    │   └── bookmarklet.html  ← Página de instalación del botón Yad2
    └── src/
        ├── App.jsx
        ├── lib/
        │   ├── config.js     ← API base URL
        │   └── supabase.js   ← Supabase client (null si no hay credenciales)
        └── components/
            ├── AddLinkForm.jsx
            ├── ApartmentCard.jsx
            ├── Board.jsx
            └── CompareView.jsx
```

---

## API endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/apartments` | Lista todos los apartamentos |
| POST | `/api/apartments` | Agrega un link (Facebook) — scrape server-side |
| POST | `/api/apartments/ingest` | Agrega datos ya scrapeados (bookmarklet Yad2) |
| PATCH | `/api/apartments/:id` | Cambia el estado |
| DELETE | `/api/apartments/:id` | Elimina un apartamento |
| GET | `/api/apartments/:id/scrape` | Re-scrapea un apartamento |
| POST | `/api/apartments/:id/votes` | Agrega voto de un usuario |
| DELETE | `/api/apartments/:id/votes/:userName` | Elimina voto |
| GET | `/api/apartments/:id/comments` | Lista comentarios |
| POST | `/api/apartments/:id/comments` | Agrega comentario |
| DELETE | `/api/apartments/:id/comments/:commentId` | Elimina comentario |

---

## Deploy

### Frontend → Vercel

1. Conecta el repo en [vercel.com](https://vercel.com)
2. Set root directory a `frontend`
3. Agrega las variables de entorno: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (apuntando a Railway)

### Backend → Railway

1. Conecta el repo en [railway.app](https://railway.app)
2. Set root directory a `backend`
3. Agrega variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ALLOWED_ORIGIN` (URL de Vercel), `PORT=3001`
4. Railway detecta Node.js y usa `npm start` automáticamente

> **Nota Yad2:** El scraper Playwright en Railway es bloqueado por ShieldSquare (IP de datacenter). Los anuncios de Yad2 se agregan exclusivamente vía bookmarklet desde el navegador del usuario.

---

## Notas

- Sin credenciales de Supabase, el backend corre con almacenamiento **en memoria** (se pierde al reiniciar). Sirve para desarrollo local sin setup.
- El Realtime de Supabase actualiza el board de todos los miembros al instante sin recargar.
- Usuarios válidos para votos/comentarios: `Adam`, `Abi`, `David`.

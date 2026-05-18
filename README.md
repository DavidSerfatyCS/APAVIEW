# ApartaView

Dashboard compartido para buscar apartamentos en grupo. Cualquier miembro pega un link (Yad2, etc.), la app scrapea el anuncio automáticamente y todos ven las cards en tiempo real.

---

## Requisitos

- Node.js 18+
- Una cuenta en [supabase.com](https://supabase.com) (gratis)

---

## Step 2 — Configurar Supabase

### 1. Crear el proyecto

Entra a [supabase.com](https://supabase.com), crea un nuevo proyecto y espera a que inicialice.

### 2. Crear la tabla

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
  status      TEXT        DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### 3. Activar Realtime

En **Table Editor → apartments → Realtime toggle** → activar.

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
# Edita .env y pega tus credenciales de Supabase
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

1. Abre `http://localhost:5173`
2. Pega un link de Yad2 en el campo de arriba
3. La card aparece de inmediato — los datos (precio, fotos, ubicación) se cargan solos en ~10s
4. Click en el badge de estado para ciclar: **Pendiente → Interesado → Descartado**
5. Filtra por estado y ordena por precio o fecha

---

## Estructura del proyecto

```
APAVIEW/
├── backend/
│   ├── index.js      ← Express API (GET/POST/PATCH /api/apartments)
│   ├── scraper.js    ← Playwright scraper para Yad2
│   ├── db.js         ← Supabase client + fallback en memoria
│   └── .env          ← SUPABASE_URL, SUPABASE_ANON_KEY, PORT
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── AddLinkForm.jsx
    │   │   ├── ApartmentCard.jsx
    │   │   └── Board.jsx
    │   └── lib/supabase.js
    └── .env           ← VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
```

---

## Deploy (Step 7)

### Frontend → Vercel

1. Conecta el repo en [vercel.com](https://vercel.com)
2. Set root directory a `frontend`
3. Agrega las variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` apuntando a Railway)

### Backend → Railway

1. Conecta el repo en [railway.app](https://railway.app)
2. Set root directory a `backend`
3. Agrega variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PORT=3001`
4. Railway detecta Node.js y usa `npm start` automáticamente
5. Playwright/Chromium funciona en Railway — no necesita configuración extra

---

## Notas

- Sin credenciales de Supabase, el backend corre con almacenamiento **en memoria** (se pierde al reiniciar). Sirve para desarrollar y probar.
- El scraper usa Playwright en modo headless para manejar páginas con JavaScript (como Yad2).
- El Realtime de Supabase actualiza el board de todos los miembros al instante sin recargar.

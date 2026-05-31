import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Plus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { API } from '../lib/config';

const COUNTDOWN_SECONDS = 10;

export default function AddLinkForm({ onHighlight }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null); // { type: 'progress'|'duplicate'|'err', msg, seconds? }
  const inputRef = useRef(null);
  const tickRef = useRef(null);
  const hideRef = useRef(null);

  useEffect(() => () => {
    clearInterval(tickRef.current);
    clearTimeout(hideRef.current);
  }, []);

  // Bookmarklet entry point: it opens the app with the scraped listing in the URL
  // hash (#add=<base64 of {url, item}>). Read it once, then strip it so a reload
  // doesn't re-add the same apartment.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#add=')) return;
    const encoded = hash.slice('#add='.length);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    let payload;
    try {
      payload = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(encoded)))));
    } catch {
      showError('No pude leer los datos del anuncio');
      return;
    }
    ingestFromBookmarklet(payload);
  }, []);

  function clearTimers() {
    clearInterval(tickRef.current);
    clearTimeout(hideRef.current);
  }

  function showError(msg) {
    clearTimers();
    setBanner({ type: 'err', msg });
    hideRef.current = setTimeout(() => setBanner(null), 5000);
  }

  function startCountdown() {
    clearTimers();
    let s = COUNTDOWN_SECONDS;
    setBanner({ type: 'progress', seconds: s });
    tickRef.current = setInterval(() => {
      s -= 1;
      if (s <= 0) {
        clearInterval(tickRef.current);
        setBanner(null);
      } else {
        setBanner({ type: 'progress', seconds: s });
      }
    }, 1000);
  }

  function showDuplicate(existing) {
    clearTimers();
    setBanner({ type: 'duplicate', existing });
    hideRef.current = setTimeout(() => setBanner(null), 6000);
  }

  function showSuccess(msg) {
    clearTimers();
    setBanner({ type: 'success', msg });
    hideRef.current = setTimeout(() => setBanner(null), 5000);
  }

  // Data already comes scraped from the bookmarklet — no background scrape, no countdown.
  async function ingestFromBookmarklet(payload) {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/apartments/ingest`, payload);
      showSuccess('Apartamento agregado desde Yad2.');
      onHighlight?.(data.id);
    } catch (err) {
      const status = err.response?.status;
      const body = err.response?.data;
      if (status === 409 && body?.existing) {
        showDuplicate(body.existing);
        onHighlight?.(body.existing.id);
      } else {
        showError(body?.error || 'No se pudo guardar el link');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    // Yad2 blocks our server from its pages (anti-bot). Pasting a yad2 link here
    // would silently produce a blank card — redirect the user to the bookmarklet.
    let host = '';
    try { host = new URL(trimmed).hostname.toLowerCase(); } catch {}
    if (host.endsWith('yad2.co.il')) {
      clearTimers();
      setBanner({ type: 'yad2' });
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/apartments`, { url: trimmed });
      setUrl('');
      inputRef.current?.focus();
      startCountdown();
      onHighlight?.(data.id);
    } catch (err) {
      const status = err.response?.status;
      const body = err.response?.data;
      if (status === 409 && body?.existing) {
        setUrl('');
        showDuplicate(body.existing);
        onHighlight?.(body.existing.id);
      } else {
        showError(body?.error || 'No se pudo guardar el link');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="py-6">
      <form onSubmit={handleSubmit} className="flex items-center gap-3 border-b border-zinc-200 pb-3 focus-within:border-zinc-900 transition-colors">
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Pega un link (Facebook)… Para Yad2 usa el botón 🏠"
          required
          className="flex-1 bg-transparent text-sm placeholder:text-zinc-400 focus:outline-none py-1.5"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-400 text-white text-xs font-medium px-3.5 py-2 rounded-md transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {loading ? 'Guardando' : 'Agregar'}
        </button>
      </form>

      {banner?.type === 'progress' && (
        <div className="mt-3 flex items-center gap-2.5 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
          <Loader2 size={14} className="animate-spin text-zinc-500 shrink-0" />
          <span>
            Apartamento agregado. Obteniendo datos…{' '}
            <span className="text-zinc-500 tabular-nums">{banner.seconds}s</span>
          </span>
        </div>
      )}

      {banner?.type === 'yad2' && (
        <div className="mt-3 flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <span>
            Los links de Yad2 no se pueden pegar aquí. Estando en el anuncio, usa el botón{' '}
            <strong>🏠 APAVIEW</strong>.{' '}
            <a href="/bookmarklet.html" target="_blank" rel="noreferrer" className="underline font-medium">
              Instalar el botón
            </a>
            .
          </span>
        </div>
      )}

      {banner?.type === 'success' && (
        <div className="mt-3 flex items-center gap-2.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
          <span>{banner.msg}</span>
        </div>
      )}

      {banner?.type === 'duplicate' && (
        <div className="mt-3 flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <span>
            Este apartamento ya fue publicado
            {banner.existing.title ? ` — "${banner.existing.title}"` : ''}. Resaltado abajo.
          </span>
        </div>
      )}

      {banner?.type === 'err' && (
        <div className="mt-3 flex items-center gap-2.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle size={14} className="text-red-600 shrink-0" />
          <span>{banner.msg}</span>
        </div>
      )}
    </div>
  );
}

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

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
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
          placeholder="Pega un link de Yad2…"
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

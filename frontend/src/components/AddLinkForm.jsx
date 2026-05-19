import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Plus, Loader2 } from 'lucide-react';
import { API } from '../lib/config';

export default function AddLinkForm() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(null);
  const inputRef = useRef(null);
  const flashTimer = useRef(null);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  function showFlash(type, msg) {
    clearTimeout(flashTimer.current);
    setFlash({ type, msg });
    flashTimer.current = setTimeout(() => setFlash(null), 4000);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await axios.post(`${API}/api/apartments`, { url: trimmed });
      setUrl('');
      setFlash({ type: 'ok', msg: 'Agregado — obteniendo datos…' });
      inputRef.current?.focus();
    } catch (err) {
      showFlash('err', err.response?.data?.error || 'No se pudo guardar el link');
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

      {flash && (
        <p className={`text-xs mt-2 ${flash.type === 'ok' ? 'text-zinc-600' : 'text-red-600'}`}>
          {flash.msg}
        </p>
      )}
    </div>
  );
}

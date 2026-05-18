import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API } from '../lib/config';

export default function AddLinkForm() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(null); // { type: 'ok' | 'err', msg }
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
      showFlash('ok', 'Agregado — obteniendo datos en background...');
      inputRef.current?.focus();
    } catch (err) {
      showFlash('err', err.response?.data?.error || 'No se pudo guardar el link');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 pt-4 pb-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Pega el link del apartamento (Yad2, Facebook Marketplace...)"
          required
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
        >
          {loading ? 'Guardando...' : '+ Agregar'}
        </button>
      </form>

      {flash && (
        <p className={`text-xs mt-2 ${flash.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
          {flash.type === 'ok' ? '✓' : '✗'} {flash.msg}
        </p>
      )}
    </div>
  );
}

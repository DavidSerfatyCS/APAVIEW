import { useEffect, useState } from 'react';
import axios from 'axios';
import { X, MapPin, Check, Minus, ThumbsUp, HelpCircle, ThumbsDown } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const FEATURE_LABELS = {
  balcony: 'Balcón',
  parking: 'Parking',
  furnished: 'Amueblado',
  elevator: 'Ascensor',
  ac: 'A/C',
  garden: 'Jardín',
  security: 'Seguridad',
};

export default function CompareView({ ids, onClose }) {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data } = await axios.get(`${API}/api/apartments`);
        if (!cancelled) {
          // preserve user's selection order
          const map = new Map(data.map((a) => [a.id, a]));
          setApartments(ids.map((id) => map.get(id)).filter(Boolean));
        }
      } catch (err) {
        console.error('Error loading apartments for compare', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [ids]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Cargando…</p>
      </div>
    );
  }

  if (apartments.length === 0) return null;

  const priceNumbers = apartments.map((a) => parseFloat((a.price || '').replace(/[^\d.]/g, '')) || Infinity);
  const minPrice = Math.min(...priceNumbers);

  const allFeatureKeys = Array.from(
    new Set(apartments.flatMap((a) => Object.keys(a.features || {})))
  );

  return (
    <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8 flex items-start justify-center">
        <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-6xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between sticky top-0 bg-white z-10">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Comparación</h2>
              <p className="text-xs text-zinc-500">{apartments.length} apartamentos</p>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-900 w-8 h-8 rounded-md hover:bg-zinc-100 flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-zinc-400 font-medium w-32"></th>
                  {apartments.map((a) => (
                    <th key={a.id} className="text-left px-4 py-3 align-top min-w-[200px]">
                      <div className="relative h-32 bg-zinc-100 rounded overflow-hidden mb-2">
                        {a.photos?.[0] ? (
                          <img src={a.photos[0]} alt={a.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-300 text-xs">Sin foto</div>
                        )}
                      </div>
                      <p className="font-semibold text-zinc-900 line-clamp-2 leading-snug">
                        {a.title || <span className="italic text-zinc-400 font-normal">Sin título</span>}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <Row label="Precio">
                  {apartments.map((a, i) => {
                    const isMin = priceNumbers[i] === minPrice && minPrice !== Infinity && apartments.length > 1;
                    return (
                      <Cell key={a.id}>
                        <span className={`tabular-nums ${isMin ? 'font-bold text-emerald-700' : 'font-semibold text-zinc-900'}`}>
                          {a.price || '—'}
                        </span>
                        {isMin && <span className="ml-2 text-[10px] text-emerald-700 uppercase tracking-wide">menor</span>}
                      </Cell>
                    );
                  })}
                </Row>

                <Row label="Ubicación">
                  {apartments.map((a) => (
                    <Cell key={a.id}>
                      {a.location ? (
                        <span className="inline-flex items-start gap-1 text-zinc-700">
                          <MapPin size={12} className="shrink-0 mt-0.5 text-zinc-400" />
                          <span>{a.location}</span>
                        </span>
                      ) : <Dash />}
                    </Cell>
                  ))}
                </Row>

                <Row label="Habitaciones">
                  {apartments.map((a) => <Cell key={a.id}>{a.features?.rooms || <Dash />}</Cell>)}
                </Row>

                <Row label="Tamaño">
                  {apartments.map((a) => <Cell key={a.id}>{a.features?.size ? `${a.features.size} m²` : <Dash />}</Cell>)}
                </Row>

                <Row label="Piso">
                  {apartments.map((a) => <Cell key={a.id}>{a.features?.floor || <Dash />}</Cell>)}
                </Row>

                {allFeatureKeys
                  .filter((k) => FEATURE_LABELS[k])
                  .map((key) => (
                    <Row key={key} label={FEATURE_LABELS[key]}>
                      {apartments.map((a) => (
                        <Cell key={a.id}>
                          {a.features?.[key]
                            ? <Check size={16} className="text-emerald-600" />
                            : <Minus size={16} className="text-zinc-300" />}
                        </Cell>
                      ))}
                    </Row>
                  ))}

                <Row label="Votos">
                  {apartments.map((a) => {
                    const summary = (a.votes || []).reduce(
                      (acc, v) => { acc[v.vote] = (acc[v.vote] || 0) + 1; return acc; },
                      {}
                    );
                    return (
                      <Cell key={a.id}>
                        <div className="flex gap-3 text-xs">
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <ThumbsUp size={12} />{summary.yes || 0}
                          </span>
                          <span className="inline-flex items-center gap-1 text-zinc-500">
                            <HelpCircle size={12} />{summary.maybe || 0}
                          </span>
                          <span className="inline-flex items-center gap-1 text-red-600">
                            <ThumbsDown size={12} />{summary.no || 0}
                          </span>
                        </div>
                      </Cell>
                    );
                  })}
                </Row>

                <Row label="Estado">
                  {apartments.map((a) => (
                    <Cell key={a.id}>
                      <span className="text-xs capitalize text-zinc-600">{a.status}</span>
                    </Cell>
                  ))}
                </Row>

                <Row label="">
                  {apartments.map((a) => (
                    <Cell key={a.id}>
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-700 hover:text-zinc-900 font-medium underline">
                        Ver anuncio →
                      </a>
                    </Cell>
                  ))}
                </Row>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <tr className="border-b border-zinc-100">
      <td className="px-4 py-3 text-[11px] uppercase tracking-wide text-zinc-400 font-medium align-top">{label}</td>
      {children}
    </tr>
  );
}

function Cell({ children }) {
  return <td className="px-4 py-3 align-top text-sm text-zinc-800">{children}</td>;
}

function Dash() {
  return <span className="text-zinc-300">—</span>;
}

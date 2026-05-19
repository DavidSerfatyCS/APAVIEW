import { useEffect, useMemo } from 'react';
import { X, MapPin, Check, Minus, ThumbsUp, HelpCircle, ThumbsDown } from 'lucide-react';
import { FEATURE_META } from '../lib/constants';
import { parsePrice, summarizeVotes } from '../lib/utils';

export default function CompareView({ apartments, onClose }) {
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const priceNumbers = useMemo(
    () => apartments.map((a) => parsePrice(a.price, Infinity)),
    [apartments]
  );
  const minPrice = useMemo(() => Math.min(...priceNumbers), [priceNumbers]);

  const allFeatureKeys = useMemo(
    () => Array.from(new Set(apartments.flatMap((a) => Object.keys(a.features || {})))),
    [apartments]
  );

  if (apartments.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8 flex items-start justify-center">
        <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-6xl overflow-hidden">
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
                  .filter((k) => FEATURE_META[k])
                  .map((key) => (
                    <Row key={key} label={FEATURE_META[key].label}>
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
                    const s = summarizeVotes(a.votes);
                    return (
                      <Cell key={a.id}>
                        <div className="flex gap-3 text-xs">
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <ThumbsUp size={12} />{s.yes}
                          </span>
                          <span className="inline-flex items-center gap-1 text-zinc-500">
                            <HelpCircle size={12} />{s.maybe}
                          </span>
                          <span className="inline-flex items-center gap-1 text-red-600">
                            <ThumbsDown size={12} />{s.no}
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

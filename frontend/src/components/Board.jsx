import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { GitCompare, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { API } from '../lib/config';
import { parsePrice } from '../lib/utils';
import ApartmentCard from './ApartmentCard';

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'interested', label: 'Interesado' },
  { value: 'discarded', label: 'Descartado' },
];

const SORTS = [
  { value: 'date_desc', label: 'Reciente' },
  { value: 'price_asc', label: 'Precio ↑' },
  { value: 'price_desc', label: 'Precio ↓' },
];

const MAX_COMPARE = 3;

export default function Board({ onCompare }) {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date_desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const pollTimer = useRef(null);

  const fetchApartments = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/apartments`);
      setApartments(data);
      return data;
    } catch (err) {
      console.error('Error fetching apartments', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const schedulePollIfNeeded = useCallback((data) => {
    if (supabase) return;
    clearTimeout(pollTimer.current);
    if (data.some((a) => a.scraping)) {
      pollTimer.current = setTimeout(async () => {
        const fresh = await fetchApartments();
        schedulePollIfNeeded(fresh);
      }, 3000);
    }
  }, [fetchApartments]);

  useEffect(() => {
    fetchApartments().then(schedulePollIfNeeded);
    return () => clearTimeout(pollTimer.current);
  }, [fetchApartments, schedulePollIfNeeded]);

  // Realtime: apartments need full refetch (scraping fields, photos, etc).
  // Votes are patched into local state to avoid an apartments refetch per vote.
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('apartview-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apartments' }, () => fetchApartments())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, ({ eventType, new: newRow, old: oldRow }) => {
        const apartmentId = newRow?.apartment_id ?? oldRow?.apartment_id;
        if (!apartmentId) return;
        setApartments((prev) => prev.map((apt) => {
          if (apt.id !== apartmentId) return apt;
          const others = (apt.votes || []).filter(
            (v) => v.user_name !== (newRow?.user_name ?? oldRow?.user_name)
          );
          const next = eventType === 'DELETE'
            ? others
            : [...others, { user_name: newRow.user_name, vote: newRow.vote }];
          return { ...apt, votes: next };
        }));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchApartments]);

  function handleStatusChange(updated) {
    setApartments((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
  }

  function handleDelete(id) {
    setApartments((prev) => prev.filter((a) => a.id !== id));
    setSelectedIds((prev) => prev.filter((s) => s !== id));
  }

  function handleRescrape(updated) {
    setApartments((prev) => {
      const next = prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a));
      schedulePollIfNeeded(next);
      return next;
    });
  }

  function handleVoteChange(apartmentId, newVotes) {
    setApartments((prev) =>
      prev.map((a) => (a.id === apartmentId ? { ...a, votes: newVotes } : a))
    );
  }

  function toggleSelected(id) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  }

  function exitCompareMode() {
    setCompareMode(false);
    setSelectedIds([]);
  }

  function launchCompare() {
    const byId = new Map(apartments.map((a) => [a.id, a]));
    onCompare(selectedIds.map((id) => byId.get(id)).filter(Boolean));
    exitCompareMode();
  }

  const filtered = useMemo(
    () => apartments.filter((a) => filterStatus === 'all' || a.status === filterStatus),
    [apartments, filterStatus]
  );

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (sortBy === 'price_asc') return parsePrice(a.price, Infinity) - parsePrice(b.price, Infinity);
    if (sortBy === 'price_desc') return parsePrice(b.price, 0) - parsePrice(a.price, 0);
    return new Date(b.created_at) - new Date(a.created_at);
  }), [filtered, sortBy]);

  const scrapingCount = useMemo(
    () => apartments.filter((a) => a.scraping).length,
    [apartments]
  );

  return (
    <div className="pb-32">
      <div className="flex flex-wrap items-center gap-2 py-4 border-b border-zinc-200">
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                filterStatus === f.value
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-zinc-200 mx-1" />

        <span className="text-zinc-400 text-xs">Orden</span>
        {SORTS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSortBy(opt.value)}
            className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
              sortBy === opt.value
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
            }`}
          >
            {opt.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-3">
          {scrapingCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Loader2 size={12} className="animate-spin" />
              Obteniendo {scrapingCount}
            </span>
          )}
          <span className="text-zinc-400 text-xs tabular-nums">{apartments.length}</span>
          <button
            onClick={() => (compareMode ? exitCompareMode() : setCompareMode(true))}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
              compareMode
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'border-zinc-200 text-zinc-700 hover:border-zinc-400'
            }`}
          >
            <GitCompare size={13} />
            {compareMode ? 'Cancelar' : 'Comparar'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-zinc-200 h-80 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && apartments.length === 0 && (
        <div className="text-center py-24 text-zinc-400">
          <p className="font-medium text-zinc-600 text-sm">No hay apartamentos todavía</p>
          <p className="text-xs mt-1.5">Pega el primer link arriba y aparece al instante.</p>
        </div>
      )}

      {!loading && apartments.length > 0 && sorted.length === 0 && (
        <p className="text-center text-zinc-400 py-12 text-sm">
          No hay apartamentos con ese filtro.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {sorted.map((apt) => (
          <ApartmentCard
            key={apt.id}
            apartment={apt}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onRescrape={handleRescrape}
            onVoteChange={handleVoteChange}
            compareMode={compareMode}
            selected={selectedIds.includes(apt.id)}
            onToggleSelect={() => toggleSelected(apt.id)}
            selectDisabled={!selectedIds.includes(apt.id) && selectedIds.length >= MAX_COMPARE}
          />
        ))}
      </div>

      {compareMode && selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 shadow-lg">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-4">
            <span className="text-sm text-zinc-700">
              <span className="font-semibold text-zinc-900">{selectedIds.length}</span>{' '}
              seleccionado{selectedIds.length !== 1 && 's'}
              {selectedIds.length < 2 && (
                <span className="text-zinc-400"> · selecciona al menos 2</span>
              )}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={exitCompareMode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-600 hover:bg-zinc-100"
              >
                <X size={13} />
                Cancelar
              </button>
              <button
                onClick={launchCompare}
                disabled={selectedIds.length < 2}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <GitCompare size={13} />
                Comparar →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

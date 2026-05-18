import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import ApartmentCard from './ApartmentCard';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'interested', label: 'Interesado' },
  { value: 'discarded', label: 'Descartado' },
];

export default function Board() {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date_desc');
  const [filterStatus, setFilterStatus] = useState('all');
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

  // Poll every 3s while any card is still scraping (fallback for no Supabase Realtime)
  const schedulePollIfNeeded = useCallback((data) => {
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

  // Supabase Realtime subscription
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('apartments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apartments' }, () => {
        fetchApartments();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchApartments]);

  function handleStatusChange(updated) {
    setApartments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }

  const filtered = apartments.filter(
    (a) => filterStatus === 'all' || a.status === filterStatus
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'price_asc') {
      const pa = parseFloat((a.price || '').replace(/[^\d.]/g, '')) || Infinity;
      const pb = parseFloat((b.price || '').replace(/[^\d.]/g, '')) || Infinity;
      return pa - pb;
    }
    if (sortBy === 'price_desc') {
      const pa = parseFloat((a.price || '').replace(/[^\d.]/g, '')) || 0;
      const pb = parseFloat((b.price || '').replace(/[^\d.]/g, '')) || 0;
      return pb - pa;
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const scrapingCount = apartments.filter((a) => a.scraping).length;

  return (
    <div className="p-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Status filter */}
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filterStatus === f.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 text-gray-600 hover:border-blue-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Sort */}
        <span className="text-gray-400 text-xs">Ordenar:</span>
        {[
          { value: 'date_desc', label: 'Reciente' },
          { value: 'price_asc', label: 'Precio ↑' },
          { value: 'price_desc', label: 'Precio ↓' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSortBy(opt.value)}
            className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
              sortBy === opt.value
                ? 'bg-gray-800 text-white border-gray-800'
                : 'border-gray-300 text-gray-600 hover:border-gray-400'
            }`}
          >
            {opt.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
          {scrapingCount > 0 && (
            <span className="flex items-center gap-1 text-blue-500">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Obteniendo datos ({scrapingCount})
            </span>
          )}
          <span>{apartments.length} apartamentos</span>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 h-72 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && apartments.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🏠</p>
          <p className="font-medium text-gray-500">No hay apartamentos todavía</p>
          <p className="text-sm mt-1">Pega el primer link arriba y aparecerá aquí al instante.</p>
        </div>
      )}

      {!loading && apartments.length > 0 && sorted.length === 0 && (
        <p className="text-center text-gray-400 py-12 text-sm">
          No hay apartamentos con ese filtro.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sorted.map((apt) => (
          <ApartmentCard
            key={apt.id}
            apartment={apt}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
    </div>
  );
}

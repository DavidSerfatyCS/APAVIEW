import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import ApartmentCard from './ApartmentCard';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Board() {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date_desc');

  const fetchApartments = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/apartments`);
      setApartments(data);
    } catch (err) {
      console.error('Error fetching apartments', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApartments();
  }, [fetchApartments]);

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

  const sorted = [...apartments].sort((a, b) => {
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
    // date_desc (default)
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <div className="p-4">
      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <span className="text-gray-500">Ordenar:</span>
        {[
          { value: 'date_desc', label: 'Más reciente' },
          { value: 'price_asc', label: 'Precio ↑' },
          { value: 'price_desc', label: 'Precio ↓' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSortBy(opt.value)}
            className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
              sortBy === opt.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 text-gray-600 hover:border-blue-400'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <span className="ml-auto text-gray-400">{apartments.length} apartamentos</span>
      </div>

      {loading && (
        <p className="text-center text-gray-400 py-12">Cargando...</p>
      )}

      {!loading && apartments.length === 0 && (
        <p className="text-center text-gray-400 py-12">
          No hay apartamentos todavía. Pega el primer link arriba.
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

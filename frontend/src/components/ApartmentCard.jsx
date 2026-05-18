import { useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const STATUS_CONFIG = {
  pending:    { label: 'Pendiente',   bg: 'bg-yellow-100', text: 'text-yellow-800', next: 'interested' },
  interested: { label: 'Interesado',  bg: 'bg-green-100',  text: 'text-green-800',  next: 'discarded' },
  discarded:  { label: 'Descartado',  bg: 'bg-red-100',    text: 'text-red-800',    next: 'pending' },
};

const FEATURE_ICONS = {
  balcony:   { icon: '🌿', label: 'Balcón' },
  parking:   { icon: '🚗', label: 'Parking' },
  furnished: { icon: '🛋️',  label: 'Amueblado' },
  elevator:  { icon: '🛗',  label: 'Ascensor' },
  ac:        { icon: '❄️',  label: 'Aire acond.' },
  garden:    { icon: '🌳', label: 'Jardín' },
  security:  { icon: '🔒', label: 'Seguridad' },
};

export default function ApartmentCard({ apartment, onStatusChange }) {
  const [photo, setPhoto] = useState(0);
  const [updating, setUpdating] = useState(false);

  const photos = apartment.photos || [];
  const features = apartment.features || {};
  const cfg = STATUS_CONFIG[apartment.status] || STATUS_CONFIG.pending;

  async function cycleStatus() {
    if (updating) return;
    setUpdating(true);
    try {
      const { data } = await axios.patch(`${API}/api/apartments/${apartment.id}`, {
        status: cfg.next,
      });
      onStatusChange(data);
    } catch (err) {
      console.error('Error updating status', err);
    } finally {
      setUpdating(false);
    }
  }

  // Scraping in progress — show skeleton card
  if (apartment.scraping) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden flex flex-col animate-pulse">
        <div className="bg-blue-50 h-48 flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-blue-400 text-xs font-medium">Obteniendo datos...</span>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <div className="h-4 bg-gray-100 rounded w-3/4" />
          <div className="h-5 bg-gray-100 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
          <div className="mt-auto pt-2">
            <a
              href={apartment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline text-xs break-all"
            >
              {apartment.url}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Photo area */}
      <div className="relative bg-gray-100 h-48 overflow-hidden">
        {photos.length > 0 ? (
          <>
            <img
              src={photos[photo]}
              alt="apartment"
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setPhoto((p) => (p - 1 + photos.length) % photos.length)}
                  className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm"
                >
                  ‹
                </button>
                <button
                  onClick={() => setPhoto((p) => (p + 1) % photos.length)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm"
                >
                  ›
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhoto(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        i === photo ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 flex-col gap-1">
            <span className="text-3xl">🏠</span>
            <span className="text-xs">Sin fotos</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
            {apartment.title || <span className="text-gray-400 italic">Sin título</span>}
          </h3>
          <button
            onClick={cycleStatus}
            disabled={updating}
            title="Click para cambiar estado"
            className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full cursor-pointer transition-opacity ${cfg.bg} ${cfg.text} ${updating ? 'opacity-50' : 'hover:opacity-80'}`}
          >
            {cfg.label}
          </button>
        </div>

        {apartment.price && (
          <p className="text-blue-600 font-bold text-lg leading-none">{apartment.price}</p>
        )}

        {apartment.location && (
          <p className="text-gray-500 text-xs flex items-center gap-1">
            <span>📍</span> {apartment.location}
          </p>
        )}

        {/* Feature tags */}
        {Object.keys(features).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {Object.entries(features).map(([key, val]) => {
              if (!val) return null;
              const feat = FEATURE_ICONS[key];
              if (feat) {
                return (
                  <span key={key} className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    {feat.icon} {feat.label}
                  </span>
                );
              }
              // rooms / size
              return (
                <span key={key} className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full capitalize">
                  {key}: {val}
                </span>
              );
            })}
          </div>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between">
          <a
            href={apartment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 text-xs font-medium"
          >
            Ver anuncio →
          </a>
          <span className="text-gray-300 text-xs">
            {new Date(apartment.created_at).toLocaleDateString('es-IL', {
              day: '2-digit', month: 'short',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

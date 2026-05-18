import { useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const STATUS_LABELS = {
  pending: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
  interested: { label: 'Interesado', className: 'bg-green-100 text-green-800' },
  discarded: { label: 'Descartado', className: 'bg-red-100 text-red-800' },
};

const STATUS_ORDER = ['pending', 'interested', 'discarded'];

export default function ApartmentCard({ apartment, onStatusChange }) {
  const [photo, setPhoto] = useState(0);
  const photos = apartment.photos || [];
  const features = apartment.features || {};

  async function cycleStatus() {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(apartment.status) + 1) % STATUS_ORDER.length];
    try {
      const { data } = await axios.patch(`${API}/api/apartments/${apartment.id}`, { status: next });
      onStatusChange(data);
    } catch (err) {
      console.error('Error updating status', err);
    }
  }

  const { label, className } = STATUS_LABELS[apartment.status] || STATUS_LABELS.pending;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      {/* Photo area */}
      <div className="relative bg-gray-100 h-48">
        {photos.length > 0 ? (
          <>
            <img
              src={photos[photo]}
              alt="apartment"
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            {photos.length > 1 && (
              <div className="absolute bottom-2 right-2 flex gap-1">
                <button
                  onClick={() => setPhoto((p) => (p - 1 + photos.length) % photos.length)}
                  className="bg-black/40 hover:bg-black/60 text-white text-xs px-2 py-1 rounded"
                >
                  ‹
                </button>
                <span className="bg-black/40 text-white text-xs px-2 py-1 rounded">
                  {photo + 1}/{photos.length}
                </span>
                <button
                  onClick={() => setPhoto((p) => (p + 1) % photos.length)}
                  className="bg-black/40 hover:bg-black/60 text-white text-xs px-2 py-1 rounded"
                >
                  ›
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            Sin fotos
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
            {apartment.title || 'Sin título'}
          </h3>
          <button
            onClick={cycleStatus}
            className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full cursor-pointer ${className}`}
          >
            {label}
          </button>
        </div>

        {apartment.price && (
          <p className="text-blue-600 font-bold text-base">{apartment.price}</p>
        )}

        {apartment.location && (
          <p className="text-gray-500 text-xs">{apartment.location}</p>
        )}

        {/* Feature tags */}
        {Object.keys(features).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(features).map(([key, val]) =>
              val ? (
                <span key={key} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full capitalize">
                  {key}
                </span>
              ) : null
            )}
          </div>
        )}

        <div className="mt-auto pt-2">
          <a
            href={apartment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline text-xs break-all"
          >
            Ver anuncio original →
          </a>
        </div>

        <p className="text-gray-400 text-xs">
          {new Date(apartment.created_at).toLocaleDateString('es-IL', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

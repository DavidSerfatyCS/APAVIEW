import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  X, ChevronLeft, ChevronRight, MapPin, Home, Loader2, AlertTriangle, RotateCw,
  ThumbsUp, ThumbsDown, HelpCircle, MessageSquare, Send, Trash2,
  Leaf, Car, Sofa, ArrowUpDown, Snowflake, Trees, Shield,
} from 'lucide-react';
import useApartmentComments from '../hooks/useApartmentComments';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const STATUS = {
  pending:    { label: 'Pendiente',  next: 'interested', class: 'bg-zinc-100 text-zinc-700' },
  interested: { label: 'Interesado', next: 'discarded',  class: 'bg-zinc-900 text-white' },
  discarded:  { label: 'Descartado', next: 'pending',    class: 'bg-zinc-200 text-zinc-500 line-through' },
};

const FEATURE_ICONS = {
  balcony:   { Icon: Leaf,          label: 'Balcón' },
  parking:   { Icon: Car,           label: 'Parking' },
  furnished: { Icon: Sofa,          label: 'Amueblado' },
  elevator:  { Icon: ArrowUpDown,   label: 'Ascensor' },
  ac:        { Icon: Snowflake,     label: 'A/C' },
  garden:    { Icon: Trees,         label: 'Jardín' },
  security:  { Icon: Shield,        label: 'Seguridad' },
};

const USERS = ['Adam', 'Abi', 'David'];
const VOTE_OPTIONS = [
  { value: 'yes',   Icon: ThumbsUp,    label: 'Sí' },
  { value: 'maybe', Icon: HelpCircle,  label: 'Quizá' },
  { value: 'no',    Icon: ThumbsDown,  label: 'No' },
];

export default function ApartmentCard({
  apartment, onStatusChange, onDelete, onRescrape, onVoteChange,
  compareMode, selected, onToggleSelect, selectDisabled,
}) {
  const [photo, setPhoto] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  // Reset photo index and error state when a different apartment is rendered into this slot
  useEffect(() => {
    setPhoto(0);
    setImgError(false);
  }, [apartment.id]);

  const photos = apartment.photos || [];
  const features = apartment.features || {};
  const votes = apartment.votes || [];
  const cfg = STATUS[apartment.status] || STATUS.pending;
  const failed = !apartment.scraping && !apartment.title && photos.length === 0;

  const voteSummary = votes.reduce(
    (acc, v) => {
      if (v.vote === 'yes') acc.yes++;
      else if (v.vote === 'no') acc.no++;
      else acc.maybe++;
      return acc;
    },
    { yes: 0, no: 0, maybe: 0 }
  );

  function goToPhoto(i) {
    setPhoto(i);
    setImgError(false);
  }

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

  async function handleDelete() {
    if (!window.confirm('¿Borrar este apartamento?')) return;
    try {
      await axios.delete(`${API}/api/apartments/${apartment.id}`);
      onDelete(apartment.id);
    } catch (err) {
      console.error('Error deleting', err);
    }
  }

  async function handleRetry() {
    if (retrying) return;
    setRetrying(true);
    try {
      const { data } = await axios.post(`${API}/api/apartments/${apartment.id}/rescrape`);
      onRescrape(data);
    } catch (err) {
      console.error('Error rescraping', err);
    } finally {
      setRetrying(false);
    }
  }

  async function castVote(userName, voteValue) {
    const current = votes.find((v) => v.user_name === userName);
    try {
      if (current?.vote === voteValue) {
        await axios.delete(`${API}/api/apartments/${apartment.id}/votes/${userName}`);
        onVoteChange(apartment.id, votes.filter((v) => v.user_name !== userName));
      } else {
        await axios.post(`${API}/api/apartments/${apartment.id}/votes`, {
          user_name: userName,
          vote: voteValue,
        });
        const next = votes.filter((v) => v.user_name !== userName);
        next.push({ user_name: userName, vote: voteValue });
        onVoteChange(apartment.id, next);
      }
    } catch (err) {
      console.error('Error voting', err);
    }
  }

  const TopActions = (
    <div className="absolute top-2 right-2 z-10 flex gap-1.5">
      <button
        onClick={handleDelete}
        title="Borrar"
        className="bg-white/95 hover:bg-red-50 text-zinc-500 hover:text-red-600 w-7 h-7 rounded-md flex items-center justify-center shadow-sm border border-zinc-200 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );

  const CompareCheckbox = compareMode && (
    <button
      onClick={onToggleSelect}
      disabled={selectDisabled}
      className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
        selected
          ? 'bg-zinc-900 border-zinc-900'
          : selectDisabled
          ? 'bg-white border-zinc-200 opacity-40 cursor-not-allowed'
          : 'bg-white border-zinc-300 hover:border-zinc-900'
      }`}
    >
      {selected && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );

  const cardBase = `relative bg-white rounded-lg border overflow-hidden flex flex-col transition-all ${
    selected ? 'border-zinc-900 ring-2 ring-zinc-900/10' : 'border-zinc-200 hover:border-zinc-300'
  }`;

  // Scraping in progress
  if (apartment.scraping) {
    return (
      <div className={`${cardBase} animate-pulse`}>
        {TopActions}
        {CompareCheckbox}
        <div className="bg-zinc-50 h-48 flex flex-col items-center justify-center gap-2 border-b border-dashed border-zinc-200">
          <Loader2 size={20} className="animate-spin text-zinc-400" />
          <span className="text-zinc-400 text-xs font-medium">Obteniendo datos…</span>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <div className="h-4 bg-zinc-100 rounded w-3/4" />
          <div className="h-5 bg-zinc-100 rounded w-1/3" />
          <div className="h-3 bg-zinc-100 rounded w-1/2" />
          <a href={apartment.url} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-700 text-xs break-all mt-2">
            {apartment.url}
          </a>
        </div>
      </div>
    );
  }

  // Failed
  if (failed) {
    return (
      <div className={`${cardBase} border-amber-300`}>
        {TopActions}
        {CompareCheckbox}
        <div className="bg-amber-50 h-48 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <AlertTriangle size={24} className="text-amber-600" />
          <p className="text-amber-800 text-sm font-medium">No se pudo obtener datos</p>
          <p className="text-amber-600 text-xs">El link puede estar caído o bloqueado.</p>
        </div>
        <div className="p-4 flex flex-col gap-3 flex-1">
          <a href={apartment.url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-900 text-xs break-all">
            {apartment.url}
          </a>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="mt-auto inline-flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-medium py-2 rounded-md transition-colors"
          >
            <RotateCw size={13} className={retrying ? 'animate-spin' : ''} />
            {retrying ? 'Reintentando' : 'Reintentar'}
          </button>
        </div>
      </div>
    );
  }

  const showPlaceholder = photos.length === 0 || imgError;

  return (
    <div className={cardBase}>
      {TopActions}
      {CompareCheckbox}

      {/* Photo */}
      <div className="relative bg-zinc-100 h-52 overflow-hidden">
        {photos.length > 0 ? (
          <>
            <img
              src={photos[photo]}
              alt={apartment.title || 'apartment'}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setPhoto((p) => (p - 1 + photos.length) % photos.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white w-7 h-7 rounded-full flex items-center justify-center"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPhoto((p) => (p + 1) % photos.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white w-7 h-7 rounded-full flex items-center justify-center"
                >
                  <ChevronRight size={16} />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToPhoto(i)}
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
          <div className="w-full h-full flex items-center justify-center text-zinc-300 flex-col gap-1">
            <Home size={28} />
            <span className="text-xs">Sin fotos</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2.5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 line-clamp-2 leading-snug flex-1">
            {apartment.title || <span className="text-zinc-400 font-normal italic">Sin título</span>}
          </h3>
          <button
            onClick={cycleStatus}
            disabled={updating}
            title="Cambiar estado"
            className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded uppercase tracking-wide transition-opacity ${cfg.class} ${updating ? 'opacity-50' : 'hover:opacity-80'}`}
          >
            {cfg.label}
          </button>
        </div>

        {apartment.price && (
          <p className="text-zinc-900 font-bold text-xl tracking-tight leading-none">
            {apartment.price}
          </p>
        )}

        {apartment.location && (
          <p className="text-zinc-500 text-xs flex items-center gap-1.5">
            <MapPin size={12} className="shrink-0" />
            <span className="line-clamp-1">{apartment.location}</span>
          </p>
        )}

        {/* Features */}
        {Object.keys(features).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {Object.entries(features).map(([key, val]) => {
              if (!val) return null;
              const feat = FEATURE_ICONS[key];
              if (feat) {
                return (
                  <span key={key} className="bg-zinc-100 text-zinc-700 text-[11px] px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                    <feat.Icon size={11} />
                    {feat.label}
                  </span>
                );
              }
              return (
                <span key={key} className="bg-zinc-100 text-zinc-700 text-[11px] px-2 py-0.5 rounded-md capitalize">
                  {key}: {val}
                </span>
              );
            })}
          </div>
        )}

        {/* Votes */}
        <div className="border-t border-zinc-100 pt-2.5 mt-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Votos</span>
            <span className="text-[11px] text-zinc-500 tabular-nums font-mono">
              {voteSummary.yes > 0 && <span className="text-emerald-700">{voteSummary.yes}✓</span>}
              {voteSummary.maybe > 0 && <span className="text-zinc-500 ml-1.5">{voteSummary.maybe}?</span>}
              {voteSummary.no > 0 && <span className="text-red-600 ml-1.5">{voteSummary.no}✗</span>}
            </span>
          </div>
          <div className="space-y-1">
            {USERS.map((user) => {
              const userVote = votes.find((v) => v.user_name === user);
              return (
                <div key={user} className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-600 w-12 shrink-0 font-medium">{user}</span>
                  <div className="flex gap-1 flex-1">
                    {VOTE_OPTIONS.map(({ value, Icon }) => {
                      const isActive = userVote?.vote === value;
                      const activeClass =
                        value === 'yes'   ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                        value === 'no'    ? 'bg-red-100 text-red-700 border-red-300' :
                                            'bg-zinc-200 text-zinc-700 border-zinc-300';
                      return (
                        <button
                          key={value}
                          onClick={() => castVote(user, value)}
                          title={`${user} vota ${value}`}
                          className={`flex-1 inline-flex items-center justify-center py-1 rounded border transition-all ${
                            isActive ? activeClass : 'border-transparent text-zinc-300 hover:text-zinc-600 hover:bg-zinc-50'
                          }`}
                        >
                          <Icon size={13} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comments */}
        <CommentsSection
          apartmentId={apartment.id}
          isOpen={commentsOpen}
          onToggle={() => setCommentsOpen((o) => !o)}
        />

        <div className="mt-auto pt-2 flex items-center justify-between text-xs">
          <a href={apartment.url} target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-zinc-900 font-medium">
            Ver anuncio →
          </a>
          <span className="text-zinc-400 tabular-nums">
            {new Date(apartment.created_at).toLocaleDateString('es-IL', {
              day: '2-digit', month: 'short',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

function CommentsSection({ apartmentId, isOpen, onToggle }) {
  const { comments, loading, addComment, removeComment } = useApartmentComments(apartmentId, isOpen);
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('Adam');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addComment(author, text.trim());
      setText('');
    } catch (err) {
      console.error('Error commenting', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-t border-zinc-100 pt-2.5 mt-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-[11px] font-medium text-zinc-500 uppercase tracking-wide hover:text-zinc-700"
      >
        <span className="inline-flex items-center gap-1.5">
          <MessageSquare size={11} />
          Comentarios
          {comments.length > 0 && (
            <span className="text-zinc-400 normal-case tracking-normal font-mono">({comments.length})</span>
          )}
        </span>
        <span className="text-zinc-400">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && (
        <div className="mt-2 space-y-2">
          {loading && comments.length === 0 && (
            <p className="text-xs text-zinc-400">Cargando…</p>
          )}
          {comments.length === 0 && !loading && (
            <p className="text-xs text-zinc-400 italic">Aún no hay comentarios.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 text-xs group">
              <Avatar name={c.user_name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-zinc-800">{c.user_name}</span>
                  <span className="text-zinc-400 text-[10px] tabular-nums">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-zinc-700 leading-relaxed break-words">{c.text}</p>
              </div>
              <button
                onClick={() => removeComment(c.id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 transition-opacity"
                title="Borrar"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
          <form onSubmit={submit} className="flex gap-1.5 pt-1">
            <select
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="text-xs bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 focus:outline-none focus:border-zinc-900"
            >
              {USERS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe un comentario…"
              className="flex-1 text-xs bg-zinc-50 border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:border-zinc-900"
            />
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="inline-flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white rounded w-7 h-7"
            >
              <Send size={11} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Avatar({ name }) {
  const colors = {
    Adam:  'bg-indigo-100 text-indigo-700',
    Abi:   'bg-pink-100 text-pink-700',
    David: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-semibold ${colors[name] || 'bg-zinc-100 text-zinc-700'}`}>
      {name[0]}
    </div>
  );
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

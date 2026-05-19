import { useState } from 'react';
import './index.css';
import AddLinkForm from './components/AddLinkForm';
import Board from './components/Board';
import CompareView from './components/CompareView';

export default function App() {
  const [compareApartments, setCompareApartments] = useState(null);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-baseline gap-3">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">ApartaView</h1>
          <span className="text-zinc-300 text-xs">·</span>
          <span className="text-zinc-500 text-sm">Búsqueda compartida</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6">
        <AddLinkForm />
        <Board onCompare={setCompareApartments} />
      </main>

      {compareApartments && compareApartments.length > 0 && (
        <CompareView apartments={compareApartments} onClose={() => setCompareApartments(null)} />
      )}
    </div>
  );
}

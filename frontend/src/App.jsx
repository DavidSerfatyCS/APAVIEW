import './index.css';
import AddLinkForm from './components/AddLinkForm';
import Board from './components/Board';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <h1 className="text-xl font-bold text-blue-600 tracking-tight">ApartaView</h1>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500 text-sm">Busqueda de apartamentos en grupo</span>
      </header>

      <div className="max-w-7xl mx-auto">
        <AddLinkForm />
        <Board />
      </div>
    </div>
  );
}

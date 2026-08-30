import React, { useState } from 'react';
import { Printer } from 'lucide-react';

export const FloatingPrintButton: React.FC = () => {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      try {
        window.focus();
        window.print();
      } catch (err) {
        console.warn('Direct print invoke issue:', err);
      } finally {
        setIsPrinting(false);
      }
    }, 50);
  };

  return (
    <aside aria-label="Ações Rápidas de Exportação" className="fixed bottom-6 right-6 z-40 print:hidden">
      <button
        id="btn-floating-print-pdf"
        type="button"
        onClick={handlePrint}
        disabled={isPrinting}
        className="cursor-pointer flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-75 text-white text-xs font-semibold rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
        title="Imprimir ou Salvar em formato PDF"
      >
        <Printer className={`w-4 h-4 ${isPrinting ? 'animate-pulse' : ''}`} />
        <span>{isPrinting ? 'Preparando...' : 'Imprimir (PDF)'}</span>
      </button>
    </aside>
  );
};

import React from 'react';
import { Globe, ShieldCheck } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Indisponível';
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações</h1>
        <p className="text-sm text-slate-500 mt-1">Configurações efetivamente aplicadas nesta execução.</p>
      </div>
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2"><Globe className="w-5 h-5 text-blue-600" /><h2 className="font-semibold">Ambiente</h2></div>
        <dl className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><dt className="text-xs text-slate-500">Idioma da interface</dt><dd className="font-semibold mt-1">Português (Brasil)</dd></div>
          <div><dt className="text-xs text-slate-500">Fuso horário do navegador</dt><dd className="font-semibold mt-1">{browserTimeZone}</dd></div>
          <div><dt className="text-xs text-slate-500">Modo de IA padrão</dt><dd className="font-semibold mt-1">Desligado</dd></div>
          <div><dt className="text-xs text-slate-500">Cálculos científicos</dt><dd className="font-semibold mt-1">Google Meridian</dd></div>
        </dl>
      </section>
      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex gap-2">
        <ShieldCheck className="w-4 h-4 shrink-0" /> Preferências que não possuem implementação real não são apresentadas como controles editáveis.
      </div>
    </div>
  );
};

import React from 'react';
import { Globe, Check } from 'lucide-react';

export const SettingsView: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 pb-20">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Configurações
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gerencie suas preferências do sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-1">
          <nav className="flex flex-col space-y-1 sticky top-6">
            <a href="#preferences" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 transition-colors">
              <Globe className="w-4 h-4" />
              Preferências
            </a>
          </nav>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Preferences Section */}
          <section id="preferences" className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-slate-400" />
                Preferências de Sistema
              </h3>
            </div>
            <div className="p-5 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Idioma Principal</label>
                  <select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition">
                    <option>Português (Brasil)</option>
                    <option>English (US)</option>
                    <option>Español</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Fuso Horário</label>
                  <select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition">
                    <option>(GMT-03:00) Brasília</option>
                    <option>(GMT-04:00) Manaus</option>
                    <option>(GMT+00:00) UTC</option>
                  </select>
                </div>
              </div>
              
              <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Notificações</h4>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-5 h-5 mt-0.5">
                    <input type="checkbox" className="peer appearance-none w-5 h-5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 checked:bg-blue-600 checked:border-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 transition-all cursor-pointer" defaultChecked />
                    <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Alertas de Treinamento</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Receber e-mail quando o modelo MMM terminar de ser calculado.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-5 h-5 mt-0.5">
                    <input type="checkbox" className="peer appearance-none w-5 h-5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 checked:bg-blue-600 checked:border-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 transition-all cursor-pointer" />
                    <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Novidades e Dicas</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Atualizações de produto, novos canais na biblioteca e dicas de modelagem.</p>
                  </div>
                </label>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

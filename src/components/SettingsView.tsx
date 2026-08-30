import React, { useState, useEffect } from 'react';
import { User, Building, CreditCard, Lock, Globe, Bell, FileText, Check, AlertCircle } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [isLoadingBilling, setIsLoadingBilling] = useState(true);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);

  // Simulate data fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingBilling(false);
      setIsLoadingAccount(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 pb-20">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Configurações
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gerencie suas preferências, dados da conta e informações de faturamento.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Navigation (Optional, could just be a stacked layout, but grid is nice for wide screens) */}
        <div className="lg:col-span-1 space-y-1">
          <nav className="flex flex-col space-y-1 sticky top-6">
            <a href="#profile" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 transition-colors">
              <User className="w-4 h-4" />
              Perfil
            </a>
            <a href="#company" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50 transition-colors">
              <Building className="w-4 h-4" />
              Empresa
            </a>
            <a href="#billing" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50 transition-colors">
              <CreditCard className="w-4 h-4" />
              Faturamento & Plano
            </a>
            <a href="#preferences" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50 transition-colors">
              <Globe className="w-4 h-4" />
              Preferências
            </a>
            <a href="#security" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50 transition-colors">
              <Lock className="w-4 h-4" />
              Segurança
            </a>
          </nav>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Profile Section */}
          <section id="profile" className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-slate-400" />
                Dados do Perfil
              </h3>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome Completo</label>
                  <input type="text" defaultValue="Usuário de Teste" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">E-mail</label>
                  <input type="email" defaultValue="usuario@exemplo.com.br" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed outline-none transition" disabled />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cargo / Função</label>
                  <input type="text" defaultValue="Analista de Marketing" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition" />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition">
                  Salvar Perfil
                </button>
              </div>
            </div>
          </section>

          {/* Company Section */}
          <section id="company" className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-slate-400" />
                Detalhes da Empresa
              </h3>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              {isLoadingAccount ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                  <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome da Empresa</label>
                      <input type="text" defaultValue="Acme Corp Brasil" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Setor</label>
                      <select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition">
                        <option>E-commerce</option>
                        <option>Varejo</option>
                        <option>B2B SaaS</option>
                        <option>Finanças</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold transition">
                      Atualizar Empresa
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Billing Section */}
          <section id="billing" className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-slate-400" />
                Faturamento & Plano
              </h3>
            </div>
            <div className="p-5 sm:p-6">
              {isLoadingBilling ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl w-full"></div>
                  <div className="flex gap-4">
                    <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
                    <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Current Plan Card */}
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">Plano Profissional</h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Ativo
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        12 projetos MMM restantes neste ciclo. Renovação em 25/09/2026.
                      </p>
                    </div>
                    <div className="shrink-0">
                      <p className="text-2xl font-black text-slate-900 dark:text-white">R$ 499<span className="text-sm font-medium text-slate-500">/mês</span></p>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-semibold text-slate-900 dark:text-white">Método de Pagamento</h5>
                    <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-8 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center border border-slate-200 dark:border-slate-700">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">VISA</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">Visa terminando em 4242</p>
                          <p className="text-xs text-slate-500">Expira em 12/28</p>
                        </div>
                      </div>
                      <button className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
                        Editar
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white rounded-lg text-sm font-semibold transition">
                      Mudar de Plano
                    </button>
                    <button className="px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium transition flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Histórico de Faturas
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

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

          {/* Security Section */}
          <section id="security" className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-slate-400" />
                Segurança
              </h3>
            </div>
            <div className="p-5 sm:p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Senha de Acesso</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Última alteração: há 3 meses.</p>
                </div>
                <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition">
                  Alterar Senha
                </button>
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Autenticação em Duas Etapas (2FA)</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Adicione uma camada extra de segurança à sua conta exigindo mais do que apenas uma senha para fazer login.
                    </p>
                  </div>
                </div>
                <button className="shrink-0 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition h-fit">
                  Ativar 2FA
                </button>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

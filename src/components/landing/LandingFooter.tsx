import React, { useState } from 'react';
import { TrendingUp, ShieldCheck, Heart, ArrowUp, X } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  const [activeModal, setActiveModal] = useState<{ title: string; content: string } | null>(null);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-900 dark:bg-black text-slate-400 text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-white">
                Easy Mix <span className="text-blue-400">Modeling</span>
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed max-w-sm text-xs">
              A plataforma definitiva de Marketing Mix Modeling (MMM) guiada pelo Google Meridian. Econometria simplificada, decisões científicas de verba e foco no ROI real.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Conformidade 100% LGPD e GDPR (Zero Pixels)</span>
            </div>
          </div>

          {/* Navigation links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Plataforma
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#recursos" className="hover:text-white transition-colors">
                  Data Hub & Ingestão
                </a>
              </li>
              <li>
                <a href="#recursos" className="hover:text-white transition-colors">
                  Motor Meridian MCMC
                </a>
              </li>
              <li>
                <a href="#recursos" className="hover:text-white transition-colors">
                  Otimizador de Verba
                </a>
              </li>
              <li>
                <a href="#recursos" className="hover:text-white transition-colors">
                  Insights com Gemini AI
                </a>
              </li>
              <li>
                <a href="#comparativo" className="hover:text-white transition-colors">
                  Econometria vs Pixels
                </a>
              </li>
            </ul>
          </div>

          {/* References & Metodology */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Metodologia
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/google/meridian"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  Google Meridian Repo
                </a>
              </li>
              <li>
                <span className="text-slate-400">Curvas de Saturação de Hill</span>
              </li>
              <li>
                <span className="text-slate-400">Adstock Geometric Decay</span>
              </li>
              <li>
                <span className="text-slate-400">Teorema da Equimarginalidade</span>
              </li>
              <li>
                <span className="text-slate-400">Model Readiness Score</span>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Legal & Suporte
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setActiveModal({
                      title: 'Termos de Uso',
                      content:
                        'Todos os cálculos de modelagem são realizados de forma segura e estritamente confidencial. As séries temporais e dados inseridos na plataforma Easy Mix Modeling pertencem exclusivamente ao usuário e não são compartilhados com terceiros nem utilizados para treinamento de modelos públicos.'
                    })
                  }
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Termos de Uso
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setActiveModal({
                      title: 'Política de Privacidade',
                      content:
                        'A plataforma Easy Mix Modeling opera sob rigorosa conformidade com a LGPD e GDPR. A metodologia de Marketing Mix Modeling (MMM) utiliza exclusivamente dados agregados de investimentos e métricas de desempenho, sem coletar identificadores pessoais de consumidores finais (Zero Cookies).'
                    })
                  }
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Política de Privacidade
                </button>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  Perguntas Frequentes
                </a>
              </li>
              <li>
                <span className="text-slate-400">suporte@easymixmodeling.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} Easy Mix Modeling SaaS. Todos os direitos reservados.
          </div>

          <div className="flex items-center gap-4">
            <span>Desenvolvido para cientistas de dados, agências e CMOs</span>
            <button
              type="button"
              onClick={scrollToTop}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Voltar ao topo"
              aria-label="Voltar ao topo"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Legal Dialog Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                {activeModal.title}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Fechar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {activeModal.content}
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>

  );
};

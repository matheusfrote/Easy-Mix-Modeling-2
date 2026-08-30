import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Building2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GoogleLoginButton } from './GoogleLoginButton';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'register',
  onSuccess
}) => {
  const { loginWithEmail, registerWithEmail, loginAsDemo } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('Marketing Lead');
  const [acceptTerms, setAcceptTerms] = useState(true);

  // Reset errors on mode switch
  const handleSwitchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setErrorMessage(null);
  };

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: 'bg-slate-200 dark:bg-slate-700' };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { score: 1, label: 'Fraca', color: 'bg-rose-500' };
    if (score === 2) return { score: 2, label: 'Razoável', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'Boa', color: 'bg-blue-500' };
    return { score: 4, label: 'Excelente', color: 'bg-emerald-500' };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const res = await loginWithEmail({ email, password });
        if (res.success) {
          if (onSuccess) onSuccess();
          onClose();
        } else {
          setErrorMessage(res.error || 'Credenciais inválidas');
        }
      } else {
        if (!acceptTerms) {
          setErrorMessage('É necessário aceitar os termos para criar sua conta.');
          setIsLoading(false);
          return;
        }

        const res = await registerWithEmail({
          name,
          email,
          password,
          company,
          role,
          acceptTerms
        });

        if (res.success) {
          if (onSuccess) onSuccess();
          onClose();
        } else {
          setErrorMessage(res.error || 'Erro ao registrar conta');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ocorreu um erro ao processar seu acesso.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    setIsLoading(true);
    await loginAsDemo();
    setIsLoading(false);
    if (onSuccess) onSuccess();
    onClose();
  };

  const handleGoogleSuccess = () => {
    if (onSuccess) onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 my-8"
        >
          {/* Header Bar */}
          <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Easy Mix Modeling
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                      Meridian MMM
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {mode === 'login'
                      ? 'Entre para acessar seus modelos e otimizador'
                      : 'Crie sua conta e otimize seu retorno de mídia'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl mt-5">
              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Entrar na Conta
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('register')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Criar Conta Gratuita
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 max-h-[75vh] overflow-y-auto">
            {/* Google Fast Connect */}
            <div className="mb-5">
              <GoogleLoginButton
                text={mode === 'login' ? 'signin_with' : 'signup_with'}
                onSuccess={handleGoogleSuccess}
                onError={err => setErrorMessage(err)}
              />
            </div>

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
                ou com e-mail corporativo
              </span>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <div>{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Nome Completo *
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Ex: Mariana Silva"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Empresa / Marca *
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={company}
                          onChange={e => setCompany(e.target.value)}
                          placeholder="Ex: Magazine Digital"
                          className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Cargo / Função
                      </label>
                      <select
                        value={role}
                        onChange={e => setRole(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      >
                        <option value="Marketing Director">CMO / Diretor de Marketing</option>
                        <option value="Growth Lead">Head de Growth / Mídia</option>
                        <option value="Data Scientist">Cientista de Dados / Econometrista</option>
                        <option value="Media Specialist">Coordenador de Mídia / BI</option>
                        <option value="Agency Executive">Executivo de Agência</option>
                        <option value="Founder">Fundador / CEO</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  E-mail Corporativo *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu.nome@empresa.com.br"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Senha *
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => alert('Para redefinir sua senha em ambiente de testes, utilize o acesso demo ou crie uma nova conta com seu e-mail.')}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'Mínimo de 8 caracteres' : 'Sua senha'}
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength indicator for registration */}
                {mode === 'register' && password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">Segurança da senha:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{passwordStrength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {mode === 'register' && (
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={acceptTerms}
                    onChange={e => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700"
                  />
                  <label htmlFor="terms" className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    Concordo com os{' '}
                    <span className="text-blue-600 dark:text-blue-400 underline cursor-pointer">Termos de Uso</span> e{' '}
                    <span className="text-blue-600 dark:text-blue-400 underline cursor-pointer">Política de Privacidade</span> da plataforma 100% em conformidade com a LGPD.
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Acessar Workspace' : 'Criar Conta e Começar'}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Access banner */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2.5">
                Deseja apenas explorar os recursos com dados de exemplo?
              </p>
              <button
                type="button"
                onClick={handleDemoAccess}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors border border-slate-200/60 dark:border-slate-700/60"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Entrar em Modo Demonstração Rápida</span>
              </button>
            </div>
          </div>

          {/* Footer Security Badges */}
          <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Dados 100% agregados e seguros</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">Baseado em Google Meridian</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

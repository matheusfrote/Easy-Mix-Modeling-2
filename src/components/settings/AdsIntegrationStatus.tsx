import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  Zap,
  Info,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Radio,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient, AdsConnectionStatusResponse, AdsPlatformStatus } from '../../services/apiClient';
import { GoogleLoginButton } from '../auth/GoogleLoginButton';

export interface AdsIntegrationStatusProps {
  className?: string;
  onCredentialsUpdated?: () => void;
}

export const AdsIntegrationStatus: React.FC<AdsIntegrationStatusProps> = ({
  className = '',
  onCredentialsUpdated
}) => {
  const { isAuthenticated, user } = useAuth();

  // Status state
  const [statusData, setStatusData] = useState<AdsConnectionStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active form tab ('google-ads' | 'meta-ads')
  const [activePlatform, setActivePlatform] = useState<'google-ads' | 'meta-ads'>('google-ads');
  const [isFormExpanded, setIsFormExpanded] = useState<boolean>(false);

  // Form states for Google Ads
  const [googleDevToken, setGoogleDevToken] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [googleCustomerId, setGoogleCustomerId] = useState('');
  const [googleRefreshToken, setGoogleRefreshToken] = useState('');
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);

  // Form states for Meta Ads
  const [metaClientId, setMetaClientId] = useState('');
  const [metaClientSecret, setMetaClientSecret] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [metaAdAccountId, setMetaAdAccountId] = useState('');
  const [showMetaSecret, setShowMetaSecret] = useState(false);
  const [showMetaToken, setShowMetaToken] = useState(false);

  // Action feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    message: string;
  } | null>(null);

  // Fetch status from server
  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiClient.getAdsStatus();
      setStatusData(data);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Não foi possível carregar o status das conexões.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus, isAuthenticated]);

  // Clear feedback messages on tab switch
  useEffect(() => {
    setActionSuccessMessage(null);
    setActionErrorMessage(null);
    setTestResult(null);
  }, [activePlatform]);

  // Handle saving credentials
  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setActionErrorMessage('Você deve estar autenticado para salvar credenciais.');
      return;
    }

    setIsSaving(true);
    setActionSuccessMessage(null);
    setActionErrorMessage(null);
    setTestResult(null);

    try {
      if (activePlatform === 'google-ads') {
        const payload: Record<string, string> = {};
        if (googleDevToken.trim()) payload.developerToken = googleDevToken.trim();
        if (googleClientId.trim()) payload.clientId = googleClientId.trim();
        if (googleClientSecret.trim()) payload.clientSecret = googleClientSecret.trim();
        if (googleCustomerId.trim()) payload.customerId = googleCustomerId.trim();
        if (googleRefreshToken.trim()) payload.refreshToken = googleRefreshToken.trim();

        if (Object.keys(payload).length === 0) {
          setActionErrorMessage('Preencha ao menos um campo para salvar ou atualizar.');
          setIsSaving(false);
          return;
        }

        const res = await apiClient.saveAdsCredentials('google-ads', payload);
        setActionSuccessMessage(res.message);
        // Clear secrets from inputs after save
        setGoogleClientSecret('');
        setGoogleRefreshToken('');
      } else {
        const payload: Record<string, string> = {};
        if (metaClientId.trim()) payload.clientId = metaClientId.trim();
        if (metaClientSecret.trim()) payload.clientSecret = metaClientSecret.trim();
        if (metaAccessToken.trim()) payload.accessToken = metaAccessToken.trim();
        if (metaAdAccountId.trim()) payload.adAccountId = metaAdAccountId.trim();

        if (Object.keys(payload).length === 0) {
          setActionErrorMessage('Preencha ao menos um campo para salvar ou atualizar.');
          setIsSaving(false);
          return;
        }

        const res = await apiClient.saveAdsCredentials('meta-ads', payload);
        setActionSuccessMessage(res.message);
        // Clear secrets from inputs after save
        setMetaClientSecret('');
        setMetaAccessToken('');
      }

      await fetchStatus();
      if (onCredentialsUpdated) onCredentialsUpdated();
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'Falha ao registrar credenciais.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle testing connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setActionSuccessMessage(null);
    setActionErrorMessage(null);
    setTestResult(null);

    try {
      const payload: Record<string, string> = {};
      if (activePlatform === 'google-ads') {
        if (googleDevToken.trim()) payload.developerToken = googleDevToken.trim();
        if (googleClientId.trim()) payload.clientId = googleClientId.trim();
      } else {
        if (metaClientId.trim()) payload.clientId = metaClientId.trim();
        if (metaClientSecret.trim()) payload.clientSecret = metaClientSecret.trim();
      }

      const res = await apiClient.testAdsConnection(
        activePlatform,
        Object.keys(payload).length > 0 ? payload : undefined
      );

      setTestResult(res);
      if (!res.success) {
        setActionErrorMessage(res.error || res.message);
      } else {
        setActionSuccessMessage(`${res.message} (Latência: ${res.latencyMs}ms)`);
      }
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'Falha no teste de conexão.');
    } finally {
      setIsTesting(false);
    }
  };

  // Handle clearing user credentials
  const handleClearCredentials = async () => {
    if (!isAuthenticated) return;
    if (!window.confirm(`Deseja remover as credenciais personalizadas de ${activePlatform === 'google-ads' ? 'Google Ads' : 'Meta Ads'} da sua sessão?`)) {
      return;
    }

    setIsClearing(true);
    setActionSuccessMessage(null);
    setActionErrorMessage(null);
    setTestResult(null);

    try {
      const res = await apiClient.clearAdsCredentials(activePlatform);
      setActionSuccessMessage(res.message);

      if (activePlatform === 'google-ads') {
        setGoogleDevToken('');
        setGoogleClientId('');
        setGoogleClientSecret('');
        setGoogleCustomerId('');
        setGoogleRefreshToken('');
      } else {
        setMetaClientId('');
        setMetaClientSecret('');
        setMetaAccessToken('');
        setMetaAdAccountId('');
      }

      await fetchStatus();
      if (onCredentialsUpdated) onCredentialsUpdated();
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'Falha ao remover credenciais.');
    } finally {
      setIsClearing(false);
    }
  };

  // Helper renderer for connection status badges
  const renderStatusBadge = (platformStatus?: AdsPlatformStatus) => {
    if (!platformStatus) return null;

    if (platformStatus.isConfigured) {
      if (platformStatus.source === 'environment') {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Conectado (.env)
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          Conectado (Sessão)
        </span>
      );
    }

    const hasAny = Object.values(platformStatus.details).some(Boolean);
    if (hasAny) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          Parcialmente Configurado
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
        Não Configurado
      </span>
    );
  };

  return (
    <section
      id="ads-integrations"
      className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Conexões de Anúncios (Google Ads & Meta Ads)
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Status dos conectores de mídia e configuração opcional de credenciais de integração.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition shrink-0"
          title="Atualizar status das credenciais"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar Status
        </button>
      </div>

      {/* Content Area */}
      <div className="p-5 sm:p-6 space-y-6">
        {errorMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-xs sm:text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Status Cards Grid: Google Ads vs Meta Ads */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Card 1: Google Ads */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5c1.58 0 2.9.58 3.94 1.52l2.94-2.94C17.07 1.84 14.73 1 12 1 7.42 1 3.55 3.6 1.7 7.37l3.65 2.83C6.23 7.37 8.87 5 12 5z" />
                      <path fill="#4285F4" d="M23.5 12.28c0-.82-.07-1.6-.21-2.28H12v4.56h6.48c-.29 1.48-1.14 2.73-2.4 3.58l3.68 2.85c2.14-1.98 3.74-4.9 3.74-8.71z" />
                      <path fill="#FBBC05" d="M5.35 14.8c-.24-.72-.37-1.49-.37-2.3s.13-1.58.37-2.3L1.7 7.37C.62 9.53 0 11.96 0 14.5s.62 4.97 1.7 7.13l3.65-2.83z" />
                      <path fill="#34A853" d="M12 23.5c3.24 0 5.97-1.07 7.96-2.92l-3.68-2.85c-1.08.73-2.47 1.17-4.28 1.17-3.13 0-5.77-2.37-6.65-5.2L1.7 16.53C3.55 20.3 7.42 23.5 12 23.5z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">Google Ads</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Search, YouTube, PMax, GDN</p>
                  </div>
                </div>
                {renderStatusBadge(statusData?.googleAds)}
              </div>

              {/* Status details checklist */}
              <div className="border-t border-slate-200/80 dark:border-slate-800 pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                    Developer Token:
                  </span>
                  <span className={statusData?.googleAds?.details?.developerTokenPresent ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                    {statusData?.googleAds?.details?.developerTokenPresent ? 'Presente' : 'Não configurado'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    OAuth Client ID:
                  </span>
                  <span className={statusData?.googleAds?.details?.clientIdPresent ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                    {statusData?.googleAds?.details?.clientIdPresent ? 'Presente' : 'Não configurado'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-slate-400" />
                    ID da Conta (Customer):
                  </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {statusData?.googleAds?.maskedCustomerId || 'Automático / Padrão'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Origem da Credencial:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                    {statusData?.googleAds?.source === 'environment'
                      ? 'Variáveis de Ambiente (.env)'
                      : statusData?.googleAds?.source === 'user_session'
                      ? 'Sessão do Usuário'
                      : 'Nenhuma'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {statusData?.googleAds?.isConfigured ? 'Pronto para sincronização MMM' : 'Necessita de credenciais'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setActivePlatform('google-ads');
                  setIsFormExpanded(true);
                }}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
              >
                Configurar / Ajustar →
              </button>
            </div>
          </div>

          {/* Card 2: Meta Ads */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#0668E1"
                        d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">Meta Ads</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Instagram, Facebook, Messenger</p>
                  </div>
                </div>
                {renderStatusBadge(statusData?.metaAds)}
              </div>

              {/* Status details checklist */}
              <div className="border-t border-slate-200/80 dark:border-slate-800 pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                    App / Client ID:
                  </span>
                  <span className={statusData?.metaAds?.details?.clientIdPresent ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                    {statusData?.metaAds?.details?.clientIdPresent ? 'Presente' : 'Não configurado'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    App Secret:
                  </span>
                  <span className={statusData?.metaAds?.details?.clientSecretPresent ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                    {statusData?.metaAds?.details?.clientSecretPresent ? 'Presente' : 'Não configurado'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-slate-400" />
                    Conta de Anúncios (act_id):
                  </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {statusData?.metaAds?.maskedAccountId || 'Automático / Padrão'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Origem da Credencial:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                    {statusData?.metaAds?.source === 'environment'
                      ? 'Variáveis de Ambiente (.env)'
                      : statusData?.metaAds?.source === 'user_session'
                      ? 'Sessão do Usuário'
                      : 'Nenhuma'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {statusData?.metaAds?.isConfigured ? 'Pronto para sincronização MMM' : 'Necessita de credenciais'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setActivePlatform('meta-ads');
                  setIsFormExpanded(true);
                }}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
              >
                Configurar / Ajustar →
              </button>
            </div>
          </div>
        </div>

        {/* Security & Authentication Notice Bar */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            {isAuthenticated ? (
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Unlock className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {isAuthenticated ? 'Sessão Autenticada e Protegida' : 'Autenticação Necessária para Inserção'}
                </h4>
                {isAuthenticated && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {user?.email} ({user?.role})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAuthenticated
                  ? 'Você possui permissão para definir credenciais opcionais. Os dados permanecem criptografados e restritos ao seu workspace.'
                  : 'O status acima é público para leitura de ambiente. Para inserir credenciais opcionais de integração, autentique-se primeiro.'}
              </p>
            </div>
          </div>

          {!isAuthenticated && (
            <div className="shrink-0 w-full sm:w-auto">
              <GoogleLoginButton
                text="signin_with"
                className="w-full sm:w-auto text-xs py-1.5 px-3"
                onSuccess={fetchStatus}
              />
            </div>
          )}
        </div>

        {/* Collapsible Form Section */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setIsFormExpanded(!isFormExpanded)}
            className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center justify-between text-left transition"
          >
            <div className="flex items-center gap-2.5">
              <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Formulário de Credenciais Opcionais
              </span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 hidden sm:inline">
                — Insira chaves manuais apenas para habilitar integrações adicionais
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                {isFormExpanded ? 'Ocultar' : 'Expandir'}
              </span>
              {isFormExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {isFormExpanded && (
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
              {/* Platform Selector Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActivePlatform('google-ads')}
                  className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
                    activePlatform === 'google-ads'
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <span>Google Ads</span>
                  {statusData?.googleAds?.isConfigured && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActivePlatform('meta-ads')}
                  className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
                    activePlatform === 'meta-ads'
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <span>Meta Ads</span>
                  {statusData?.metaAds?.isConfigured && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  )}
                </button>
              </div>

              {/* Informational callout */}
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-lg flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Preenchimento Opcional</p>
                  <p className="text-blue-700/80 dark:text-blue-300/80">
                    Se as variáveis de ambiente já estiverem configuradas no servidor (.env), não é necessário preencher este formulário. Utilize-o apenas caso deseje substituir ou conectar credenciais específicas para este usuário.
                  </p>
                </div>
              </div>

              {/* Messages */}
              {actionSuccessMessage && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{actionSuccessMessage}</span>
                </div>
              )}

              {actionErrorMessage && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-xs sm:text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{actionErrorMessage}</span>
                </div>
              )}

              {/* Form Body */}
              <form onSubmit={handleSaveCredentials} className="space-y-4">
                {/* Google Ads Tab */}
                {activePlatform === 'google-ads' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Developer Token (Google)</span>
                          <span className="text-[10px] text-slate-400 font-normal">Opcional se no .env</span>
                        </label>
                        <input
                          type="text"
                          value={googleDevToken}
                          onChange={e => setGoogleDevToken(e.target.value)}
                          placeholder="ex: 29xYzAbCdeFgHiJk..."
                          disabled={!isAuthenticated || isSaving}
                          className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Client ID OAuth</span>
                          <span className="text-[10px] text-slate-400 font-normal">Opcional se no .env</span>
                        </label>
                        <input
                          type="text"
                          value={googleClientId}
                          onChange={e => setGoogleClientId(e.target.value)}
                          placeholder="ex: 123456789-xyz.apps.googleusercontent.com"
                          disabled={!isAuthenticated || isSaving}
                          className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Client Secret OAuth</span>
                          <span className="text-[10px] text-slate-400 font-normal">Sensível</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showGoogleSecret ? 'text' : 'password'}
                            value={googleClientSecret}
                            onChange={e => setGoogleClientSecret(e.target.value)}
                            placeholder={statusData?.googleAds?.details?.clientSecretPresent ? '•••••••••••• (Já registrado)' : 'ex: GOCSPX-abcde12345...'}
                            disabled={!isAuthenticated || isSaving}
                            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition pr-9 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <button
                            type="button"
                            onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            {showGoogleSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Customer ID da Conta</span>
                          <span className="text-[10px] text-slate-400 font-normal">10 dígitos</span>
                        </label>
                        <input
                          type="text"
                          value={googleCustomerId}
                          onChange={e => setGoogleCustomerId(e.target.value)}
                          placeholder="ex: 123-456-7890"
                          disabled={!isAuthenticated || isSaving}
                          className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Meta Ads Tab */}
                {activePlatform === 'meta-ads' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>App ID / Client ID (Meta)</span>
                          <span className="text-[10px] text-slate-400 font-normal">Opcional se no .env</span>
                        </label>
                        <input
                          type="text"
                          value={metaClientId}
                          onChange={e => setMetaClientId(e.target.value)}
                          placeholder="ex: 109283746592817"
                          disabled={!isAuthenticated || isSaving}
                          className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>App Secret</span>
                          <span className="text-[10px] text-slate-400 font-normal">Sensível</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showMetaSecret ? 'text' : 'password'}
                            value={metaClientSecret}
                            onChange={e => setMetaClientSecret(e.target.value)}
                            placeholder={statusData?.metaAds?.details?.clientSecretPresent ? '•••••••••••• (Já registrado)' : 'ex: e27b82f09312...'}
                            disabled={!isAuthenticated || isSaving}
                            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition pr-9 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <button
                            type="button"
                            onClick={() => setShowMetaSecret(!showMetaSecret)}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            {showMetaSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Access Token (System User / Graph API)</span>
                          <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showMetaToken ? 'text' : 'password'}
                            value={metaAccessToken}
                            onChange={e => setMetaAccessToken(e.target.value)}
                            placeholder={statusData?.metaAds?.details?.accessTokenPresent ? '•••••••••••• (Já registrado)' : 'ex: EAAB...'}
                            disabled={!isAuthenticated || isSaving}
                            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition pr-9 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <button
                            type="button"
                            onClick={() => setShowMetaToken(!showMetaToken)}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            {showMetaToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Ad Account ID</span>
                          <span className="text-[10px] text-slate-400 font-normal">Identificador da Conta</span>
                        </label>
                        <input
                          type="text"
                          value={metaAdAccountId}
                          onChange={e => setMetaAdAccountId(e.target.value)}
                          placeholder="ex: act_1234567890"
                          disabled={!isAuthenticated || isSaving}
                          className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Action Controls */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition disabled:opacity-50"
                    >
                      <Zap className={`w-3.5 h-3.5 text-amber-500 ${isTesting ? 'animate-bounce' : ''}`} />
                      {isTesting ? 'Testando Conexão...' : 'Testar Conexão'}
                    </button>

                    {isAuthenticated && (
                      <button
                        type="button"
                        onClick={handleClearCredentials}
                        disabled={isClearing}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remover da Sessão
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isAuthenticated ? (
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs disabled:opacity-50"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Salvar Credenciais
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Faça login para salvar
                      </span>
                    )}
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

import React, { useState } from 'react';
import { GoogleLogin, useGoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';

export interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  className?: string;
  disabled?: boolean;
  useOfficialRender?: boolean;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  onError,
  text = 'continue_with',
  className = '',
  disabled = false,
  useOfficialRender = false
}) => {
  const { loginWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const getLabel = () => {
    switch (text) {
      case 'signin_with':
        return 'Entrar com o Google';
      case 'signup_with':
        return 'Cadastrar com o Google';
      case 'continue_with':
      default:
        return 'Continuar com o Google';
    }
  };

  const handleCredentialSuccess = async (credentialResponse: CredentialResponse) => {
    if (disabled || isLoading) return;
    setIsLoading(true);

    try {
      // Send credential to AuthContext -> /api/auth/google for server-side verification
      const res = await loginWithGoogle(credentialResponse.credential);
      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        if (onError) onError(res.error || 'Falha ao autenticar com o Google.');
      }
    } catch (err: any) {
      if (onError) onError(err?.message || 'Erro inesperado na validação do Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialError = () => {
    setIsLoading(false);
    if (onError) onError('Falha na autenticação social com o Google.');
  };

  // useGoogleLogin hook for custom trigger button
  const loginWithHook = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        // Send access token or code to backend proxy without logging or exposing in window
        const res = await loginWithGoogle(tokenResponse.access_token);
        if (res.success && onSuccess) {
          onSuccess();
        } else if (!res.success && onError) {
          onError(res.error || 'Falha na autenticação.');
        }
      } catch (err: any) {
        if (onError) onError(err?.message || 'Erro ao processar login.');
      } finally {
        setIsLoading(false);
      }
    },
    onError: (errorResponse) => {
      console.warn('Google login error hook:', errorResponse);
      setIsLoading(false);
      if (onError) onError('A autenticação com o Google foi cancelada ou falhou.');
    }
  });

  const handleCustomClick = async () => {
    if (disabled || isLoading) return;
    try {
      loginWithHook();
    } catch {
      // Fallback if environment blocks popups in iframe
      setIsLoading(true);
      const res = await loginWithGoogle();
      setIsLoading(false);
      if (res.success && onSuccess) onSuccess();
    }
  };

  if (useOfficialRender) {
    return (
      <div className={`w-full flex justify-center ${className}`}>
        <GoogleLogin
          onSuccess={handleCredentialSuccess}
          onError={handleCredentialError}
          text={text as 'continue_with' | 'signin_with' | 'signup_with' | 'signin'}
          shape="rectangular"
          theme="outline"
          size="large"
          width="100%"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      id="google-auth-button"
      onClick={handleCustomClick}
      disabled={disabled || isLoading}
      className={`w-full relative flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-sm transition-all duration-200 shadow-xs hover:shadow-sm hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-60 disabled:cursor-not-allowed group ${className}`}
      aria-label={getLabel()}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-slate-400 border-t-blue-600 rounded-full animate-spin shrink-0" />
      ) : (
        <svg
          className="w-5 h-5 transition-transform group-hover:scale-105 shrink-0"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            fill="#EA4335"
          />
        </svg>
      )}
      <span className="truncate">{isLoading ? 'Conectando ao Google...' : getLabel()}</span>
    </button>
  );
};

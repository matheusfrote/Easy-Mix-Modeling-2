import React, { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
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
  className = '',
  disabled = false
}) => {
  const { loginAsGuest } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleDirectAccess = () => {
    if (disabled || isLoading) return;
    setIsLoading(true);
    try {
      if (loginAsGuest) {
        loginAsGuest();
      }
      if (onSuccess) {
        onSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      id="google-auth-button"
      onClick={handleDirectAccess}
      disabled={disabled || isLoading}
      className={`w-full relative flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold text-sm transition-all duration-200 shadow-md shadow-blue-500/20 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed group ${className}`}
      aria-label="Acessar Plataforma sem Login"
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
      ) : (
        <Sparkles className="w-4 h-4 text-amber-300 transition-transform group-hover:scale-110 shrink-0" />
      )}
      <span>Acessar Workspace sem Login</span>
      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 shrink-0" />
    </button>
  );
};

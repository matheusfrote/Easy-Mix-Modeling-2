import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '../types/auth';

interface AuthContextType extends AuthState {
  loginWithGoogle: (googleCredential?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  updateUserPlan: (plan: 'starter' | 'pro' | 'enterprise') => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'easy_mix_auth_user';
const TOKEN_STORAGE_KEY = 'easy_mix_auth_token';

// Default local analyst session allowing immediate, barrier-free access without creating accounts
export const DEFAULT_LOCAL_USER: User = {
  id: 'usr_local_analyst',
  email: 'analista@meridian.local',
  name: 'Analista de Mídia',
  company: 'Workspace Livre',
  role: 'ANALYST',
  plan: 'pro',
  provider: 'demo',
  createdAt: '2025-01-01T00:00:00.000Z'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) return parsed;
      }
    } catch {
      // fallback to default
    }
    return DEFAULT_LOCAL_USER;
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY) || 'local_session_token';
    } catch {
      return 'local_session_token';
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Synchronize local session persistence
  useEffect(() => {
    try {
      if (!localStorage.getItem(AUTH_STORAGE_KEY)) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(DEFAULT_LOCAL_USER));
      }
      if (!localStorage.getItem(TOKEN_STORAGE_KEY)) {
        localStorage.setItem(TOKEN_STORAGE_KEY, 'local_session_token');
      }
    } catch {
      // Ignore in strict private browsing environments
    }
  }, []);

  const saveUserSession = (newUser: User | null, newToken: string | null = null) => {
    const finalUser = newUser || DEFAULT_LOCAL_USER;
    const finalToken = newToken || 'local_session_token';
    setUser(finalUser);
    setToken(finalToken);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(finalUser));
      localStorage.setItem(TOKEN_STORAGE_KEY, finalToken);
    } catch {
      // ignore
    }
  };

  const loginAsGuest = () => {
    saveUserSession(DEFAULT_LOCAL_USER, 'local_session_token');
  };

  const loginWithGoogle = async (_credential?: string): Promise<{ success: boolean; error?: string }> => {
    loginAsGuest();
    return { success: true };
  };

  const logout = async () => {
    // Reset to default local user session so the user is never locked out
    saveUserSession(DEFAULT_LOCAL_USER, 'local_session_token');
  };

  const updateUserPlan = (_plan: 'starter' | 'pro' | 'enterprise') => {
    console.warn('[Security] Planos são gerenciados pelo backend via faturamento e permissões.');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: true,
        isLoading,
        token,
        loginWithGoogle,
        loginAsGuest,
        logout,
        updateUserPlan
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

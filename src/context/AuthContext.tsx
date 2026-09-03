import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState, RegisterFormData, LoginFormData } from '../types/auth';

interface AuthContextType extends AuthState {
  loginWithGoogle: (googleCredential?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUserPlan: (plan: 'starter' | 'pro' | 'enterprise') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'easy_mix_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      }
    } catch (e) {
      console.warn('Could not restore auth session:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveUserSession = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  const loginWithGoogle = async (googleCredential?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      if (!googleCredential) {
        throw new Error('Token do Google ausente. Por favor, faça login com o Google.');
      }
      // Call backend route to securely verify Google token and obtain sanitized profile
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: googleCredential })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || 'Falha ao autenticar com o Google.');
      }

      const data = await response.json();
      if (data?.user) {
        saveUserSession(data.user);
        return { success: true };
      }

      throw new Error('Perfil de usuário não retornado pela autenticação.');
    } catch (err: any) {
      console.error('Google OAuth Login error:', err);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    saveUserSession(null);
  };

  const updateUserPlan = (plan: 'starter' | 'pro' | 'enterprise') => {
    if (user) {
      const updated = { ...user, plan };
      saveUserSession(updated);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginWithGoogle,
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

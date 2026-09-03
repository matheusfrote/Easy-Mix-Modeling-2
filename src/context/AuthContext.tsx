import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '../types/auth';

interface AuthContextType extends AuthState {
  loginWithGoogle: (googleCredential?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUserPlan: (plan: 'starter' | 'pro' | 'enterprise') => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'easy_mix_auth_user';
const TOKEN_STORAGE_KEY = 'easy_mix_auth_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and verify auth state from server
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!storedToken) {
          setIsLoading(false);
          return;
        }

        setToken(storedToken);

        // Verify session with server (/api/auth/me)
        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
          } else {
            // Invalid or expired session
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            setUser(null);
            setToken(null);
          }
        }
      } catch (e) {
        console.warn('Could not restore auth session:', e);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const saveUserSession = (newUser: User | null, newToken: string | null = null) => {
    setUser(newUser);
    if (newUser && newToken) {
      setToken(newToken);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    } else {
      setToken(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  };

  const loginWithGoogle = async (googleCredential?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      if (!googleCredential) {
        throw new Error('Token do Google ausente. Por favor, faça login com o Google.');
      }
      // Call backend route to securely verify Google token cryptographically
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
      if (data?.user && data?.token) {
        saveUserSession(data.user, data.token);
        return { success: true };
      }

      throw new Error('Perfil de usuário ou token não retornado pela autenticação.');
    } catch (err: any) {
      console.error('Google OAuth Login error:', err);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).catch(() => {});
      }
    } finally {
      saveUserSession(null, null);
    }
  };

  // Rule 15: Plan Security - Prevent client-side plan elevation
  const updateUserPlan = (_plan: 'starter' | 'pro' | 'enterprise') => {
    console.warn('[Security] Planos são determinados pelo backend via faturamento e permissões da organização.');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        token,
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

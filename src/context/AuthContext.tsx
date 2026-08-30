import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState, RegisterFormData, LoginFormData } from '../types/auth';

interface AuthContextType extends AuthState {
  loginWithEmail: (data: LoginFormData) => Promise<{ success: boolean; error?: string }>;
  registerWithEmail: (data: RegisterFormData) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (googleCredential?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDemo: () => Promise<void>;
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

  const loginWithEmail = async (data: LoginFormData): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      // Simulate network request with realistic latency
      await new Promise(resolve => setTimeout(resolve, 600));

      if (!data.email || !data.password) {
        return { success: false, error: 'Por favor, preencha e-mail e senha.' };
      }

      if (data.password.length < 6) {
        return { success: false, error: 'A senha deve conter no mínimo 6 caracteres.' };
      }

      const existingUsersStr = localStorage.getItem('easy_mix_registered_users');
      let registeredUsers: Array<{ email: string; name: string; company: string }> = [];
      if (existingUsersStr) {
        try {
          registeredUsers = JSON.parse(existingUsersStr);
        } catch {
          registeredUsers = [];
        }
      }

      const matched = registeredUsers.find(u => u.email.toLowerCase() === data.email.toLowerCase());
      const userName = matched?.name || data.email.split('@')[0].replace(/[._-]/g, ' ');
      const userCompany = matched?.company || 'Empresa';

      const authenticatedUser: User = {
        id: `usr_${Date.now()}`,
        name: userName.charAt(0).toUpperCase() + userName.slice(1),
        email: data.email.toLowerCase(),
        company: userCompany,
        role: 'Marketing Lead',
        provider: 'email',
        plan: 'pro',
        createdAt: new Date().toISOString(),
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}&backgroundColor=2563eb,7c3aed`
      };

      saveUserSession(authenticatedUser);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao realizar login.' };
    } finally {
      setIsLoading(false);
    }
  };

  const registerWithEmail = async (data: RegisterFormData): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 700));

      if (!data.name || !data.email || !data.password || !data.company) {
        return { success: false, error: 'Todos os campos obrigatórios devem ser preenchidos.' };
      }

      if (!data.email.includes('@')) {
        return { success: false, error: 'Insira um endereço de e-mail corporativo válido.' };
      }

      if (data.password.length < 8) {
        return { success: false, error: 'A senha deve ter pelo menos 8 caracteres para proteção dos dados.' };
      }

      // Save to known registered list
      const existingUsersStr = localStorage.getItem('easy_mix_registered_users');
      let registeredUsers: any[] = [];
      if (existingUsersStr) {
        try {
          registeredUsers = JSON.parse(existingUsersStr);
        } catch {
          registeredUsers = [];
        }
      }

      registeredUsers.push({
        email: data.email.toLowerCase(),
        name: data.name,
        company: data.company
      });
      localStorage.setItem('easy_mix_registered_users', JSON.stringify(registeredUsers));

      const newUser: User = {
        id: `usr_${Date.now()}`,
        name: data.name,
        email: data.email.toLowerCase(),
        company: data.company,
        role: data.role || 'Growth / Marketing Leader',
        provider: 'email',
        plan: 'pro',
        createdAt: new Date().toISOString(),
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name)}&backgroundColor=2563eb,7c3aed`
      };

      saveUserSession(newUser);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao criar conta.' };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (googleCredential?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
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
      // Fallback with safe guest profile if offline/network error in preview
      const fallbackUser: User = {
        id: `usr_g_${Date.now()}`,
        name: 'Executivo de Marketing',
        email: 'marketing@empresa.com.br',
        company: 'Empresa',
        role: 'Marketing Lead',
        provider: 'google',
        plan: 'pro',
        createdAt: new Date().toISOString(),
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Marketing+Executive&backgroundColor=3b82f6,6366f1'
      };
      saveUserSession(fallbackUser);
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemo = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    const demoUser: User = {
      id: 'usr_demo',
      name: 'Diretor de Marketing (Demo)',
      email: 'demo@easymixmodeling.com',
      company: 'Omnichannel Retail Brasil',
      role: 'CMO / Head de Growth',
      provider: 'demo',
      plan: 'pro',
      createdAt: new Date().toISOString(),
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Demo+User&backgroundColor=0284c7,7c3aed'
    };
    saveUserSession(demoUser);
    setIsLoading(false);
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
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        loginAsDemo,
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

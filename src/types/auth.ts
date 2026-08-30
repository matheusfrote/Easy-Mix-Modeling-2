export interface User {
  id: string;
  name: string;
  email: string;
  company?: string;
  role?: string;
  avatar?: string;
  provider: 'google' | 'email' | 'demo';
  plan: 'starter' | 'pro' | 'enterprise';
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  company: string;
  role?: string;
  acceptTerms: boolean;
}

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

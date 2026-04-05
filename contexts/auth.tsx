import { createContext, useContext, useState, useEffect } from 'react';
import { getAccessToken, clearTokens, setSessionExpiredCallback } from '@/services/api';
import { getUser, User } from '@/services/user';
import { getBanks } from '@/services/bank';
import { login as loginService } from '@/services/auth';
import { decodeJwtPayload } from '@/utils/jwt';
import { queryClient } from '@/contexts/query';

interface AuthContextData {
  user: User | null;
  signed: boolean;
  loading: boolean;
  signIn: (credentials: { email?: string; username?: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredUser();
    setSessionExpiredCallback(() => {
      setUser(null);
      queryClient.clear();
    });
  }, []);

  async function loadStoredUser() {
    try {
      const token = await getAccessToken();
      if (token) {
        const payload = decodeJwtPayload(token);
        const userData = await getUser(payload.sub);
        setUser(userData);
        prefetchBanks(userData.id);
      }
    } catch {
      await clearTokens();
    } finally {
      setLoading(false);
    }
  }

  function prefetchBanks(userId: string) {
    queryClient.prefetchQuery({
      queryKey: ['banks', userId],
      queryFn: () => getBanks(userId),
      staleTime: 1000 * 60 * 10,
    });
  }

  async function signIn(credentials: { email?: string; username?: string; password: string }) {
    const { accessToken } = await loginService(credentials);
    const payload = decodeJwtPayload(accessToken);
    const userData = await getUser(payload.sub);
    setUser(userData);
    prefetchBanks(userData.id);
  }

  async function refreshUser() {
    if (!user) return;
    try {
      const userData = await getUser(user.id);
      setUser(userData);
    } catch {
      // silently fail
    }
  }

  async function signOut() {
    await clearTokens();
    setUser(null);
    queryClient.clear();
  }

  return (
    <AuthContext.Provider value={{ user, signed: !!user, loading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

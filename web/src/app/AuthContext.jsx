import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { login as apiLogin, logout as apiLogout, me as apiMe } from '../api/auth';
import { setAuthFailureHandler, tokens } from '../api/client';

const AuthCtx = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Restore session on load.
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (tokens.access) {
        try {
          const u = await apiMe();
          if (mounted) setUser(u);
        } catch {
          tokens.clear();
        }
      }
      if (mounted) setInitializing(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Client signals when a refresh ultimately fails → force logout.
  useEffect(() => {
    setAuthFailureHandler(() => setUser(null));
    return () => setAuthFailureHandler(null);
  }, []);

  const signIn = useCallback(async (email, password) => {
    const u = await apiLogin(email, password);
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, signIn, signOut }),
    [user, initializing, signIn, signOut],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

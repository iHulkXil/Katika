import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { setAuthTokenGetter } from '@workspace/api-client-react';

export type ServerUser = {
  id: number;
  privyUserId: string;
  demoCredits: number;
  ktk?: number;
  allocated?: number;
  wagered?: number;
  rolloverNeed?: number;
  rolloverLeft?: number;
  unlocked?: boolean;
  profileComplete?: boolean;
};

type ServerSessionValue = {
  serverUser: ServerUser | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const ServerSessionContext = createContext<ServerSessionValue>({
  serverUser: null,
  loading: false,
  error: null,
  refresh: async () => {},
});

export function useServerSession() {
  return useContext(ServerSessionContext);
}

export function ServerSessionSync({ children }: { children?: ReactNode }) {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [serverUser, setServerUser] = useState<ServerUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAuthTokenGetter(async () => {
      if (!authenticated) return null;
      try {
        return await getAccessToken();
      } catch {
        return null;
      }
    });
    return () => setAuthTokenGetter(null);
  }, [authenticated, getAccessToken]);

  const refresh = useCallback(async () => {
    if (!authenticated) {
      setServerUser(null);
      setError(null);
      return;
    }
    const token = await getAccessToken();
    if (!token) {
      setError('No session token');
      return;
    }
    try {
      const response = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        setServerUser(null);
        setError(`API ${response.status}`);
        return;
      }
      const body = (await response.json()) as ServerUser;
      setServerUser(body);
      setError(null);
    } catch {
      setServerUser(null);
      setError('API unreachable');
    }
  }, [authenticated, getAccessToken]);

  useEffect(() => {
    if (!ready || !authenticated) {
      setServerUser(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void refresh().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, refresh]);

  return (
    <ServerSessionContext.Provider value={{ serverUser, loading, error, refresh }}>
      {children ?? null}
    </ServerSessionContext.Provider>
  );
}

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
};

type ServerSessionValue = {
  serverUser: ServerUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const ServerSessionContext = createContext<ServerSessionValue>({
  serverUser: null,
  loading: false,
  refresh: async () => {},
});

export function useServerSession() {
  return useContext(ServerSessionContext);
}

export function ServerSessionSync({ children }: { children?: ReactNode }) {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [serverUser, setServerUser] = useState<ServerUser | null>(null);
  const [loading, setLoading] = useState(false);

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
      return;
    }
    const token = await getAccessToken();
    if (!token) return;
    const response = await fetch('/api/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    setServerUser((await response.json()) as ServerUser);
  }, [authenticated, getAccessToken]);

  useEffect(() => {
    if (!ready || !authenticated) {
      setServerUser(null);
      setLoading(false);
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
    <ServerSessionContext.Provider value={{ serverUser, loading, refresh }}>
      {children ?? null}
    </ServerSessionContext.Provider>
  );
}

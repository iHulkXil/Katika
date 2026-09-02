import {
  createContext,
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
};

const ServerSessionContext = createContext<ServerSessionValue>({
  serverUser: null,
  loading: false,
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

  useEffect(() => {
    if (!ready || !authenticated) {
      setServerUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token || cancelled) return;
        const response = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const body = (await response.json()) as ServerUser;
        if (!cancelled) setServerUser(body);
      } catch {
        // API may be down.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, getAccessToken]);

  return (
    <ServerSessionContext.Provider value={{ serverUser, loading }}>
      {children ?? null}
    </ServerSessionContext.Provider>
  );
}

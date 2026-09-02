import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import { setAuthTokenGetter } from '@workspace/api-client-react';

type MeResponse = {
  id: number;
  privyUserId: string;
  createdAt: string;
  updatedAt: string;
};

export function ServerSessionSync() {
  const { ready, authenticated, getAccessToken } = usePrivy();

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

  const meQuery = useQuery({
    queryKey: ['api', 'me', authenticated],
    enabled: ready && authenticated,
    queryFn: async (): Promise<MeResponse> => {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Missing Privy access token');
      }
      const response = await fetch('/api/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? `HTTP ${response.status}`);
      }
      return response.json() as Promise<MeResponse>;
    },
    retry: false,
  });

  if (!ready || !authenticated) {
    return null;
  }

  if (meQuery.isPending) {
    return (
      <p className="sr-only" data-testid="status-server-session-loading">
        Syncing account
      </p>
    );
  }

  return null;
}

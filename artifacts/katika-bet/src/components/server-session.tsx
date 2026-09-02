import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { setAuthTokenGetter } from '@workspace/api-client-react';

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

  useEffect(() => {
    if (!ready || !authenticated) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token || cancelled) return;
        await fetch('/api/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // API may be down until Neon + secret are configured.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, getAccessToken]);

  return null;
}

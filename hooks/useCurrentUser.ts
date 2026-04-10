import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UseCurrentUserResult {
  user: CurrentUser | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch the currently logged-in user from the server.
 * Uses /api/auth/check which reads the JWT access token from cookies.
 * 
 * - Returns null if not authenticated
 * - Caches the result to avoid refetching on every render
 * - Handles abort on unmount to prevent memory leaks
 */
export function useCurrentUser(): UseCurrentUserResult {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasFetched = useRef(false);

  const fetchUser = useCallback(async () => {
    // Prevent duplicate fetches
    if (hasFetched.current) return;
    hasFetched.current = true;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/auth/check', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        signal,
      });

      if (!isMounted.current) return;

      if (res.status === 401 || res.status === 403) {
        setUser(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch user`);
      }

      const data = await res.json();

      if (!isMounted.current) return;

      if (data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
      setError(null);
    } catch (err) {
      if (!isMounted.current) return;
      if (err instanceof Error && err.name === 'AbortError') return;

      console.error('[useCurrentUser] Error fetching user:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setUser(null);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [router]);

  useEffect(() => {
    isMounted.current = true;
    fetchUser();

    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchUser]);

  return { user, isLoading, error };
}

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
  const fetchCountRef = useRef(0);
  const maxRetries = 2;
  const userRef = useRef<CurrentUser | null>(null);

  // Keep ref in sync with user state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const fetchUser = useCallback(async (retryCount = 0) => {
    // Check for pending user from login redirect
    if (typeof window !== 'undefined' && fetchCountRef.current === 0) {
      const pendingUser = sessionStorage.getItem('pendingUser');
      if (pendingUser) {
        try {
          const parsedUser = JSON.parse(pendingUser);
          if (!isMounted.current) return;
          
          // Set user immediately from sessionStorage
          setUser(parsedUser);
          userRef.current = parsedUser;
          setIsLoading(false);
          
          // Clear pending user
          sessionStorage.removeItem('pendingUser');
          
          // Still verify with server in background
          console.log('[useCurrentUser] Using pending user from sessionStorage, verifying with server...');
        } catch (e) {
          // Invalid pendingUser, clear it
          sessionStorage.removeItem('pendingUser');
        }
      }
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    try {
      // If we already have user from sessionStorage, don't show loading
      if (!userRef.current) {
        setIsLoading(true);
      }
      setError(null);

      const res = await fetch('/api/auth/check', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        signal,
      });

      if (!isMounted.current) return;

      if (res.status === 401 || res.status === 403) {
        // If we haven't retried yet, try one more time after a short delay
        // This handles the case where cookies aren't set immediately after login
        if (retryCount < maxRetries && fetchCountRef.current <= maxRetries) {
          fetchCountRef.current++;
          console.log(`[useCurrentUser] Retrying fetch (${retryCount + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 300));
          fetchUser(retryCount + 1);
          return;
        }
        // Don't clear user if we already have one from sessionStorage
        if (!userRef.current) {
          setUser(null);
        }
        setError(null);
        if (!userRef.current) {
          setIsLoading(false);
        }
        return;
      }

      if (!res.ok) {
        // Log 404s at warn level since they may occur during dev/hot-reload
        const logLevel = res.status === 404 ? 'warn' : 'error';
        console[logLevel](`[useCurrentUser] HTTP ${res.status} from /api/auth/check`);
        
        // Don't throw on 404 - treat as unauthorized
        if (res.status === 404 || res.status === 401 || res.status === 403) {
          if (!userRef.current) {
            setUser(null);
          }
          setError(null);
          if (!userRef.current) {
            setIsLoading(false);
          }
          return;
        }
        
        throw new Error(`HTTP ${res.status}: Failed to fetch user`);
      }

      const data = await res.json();

      if (!isMounted.current) return;

      if (data.user) {
        setUser(data.user);
        userRef.current = data.user;
      } else if (!userRef.current) {
        // Only set to null if we don't have pending user
        setUser(null);
      }
      setError(null);
      setIsLoading(false);
    } catch (err) {
      if (!isMounted.current) return;
      if (err instanceof Error && err.name === 'AbortError') return;

      // Retry on network errors
      if (retryCount < maxRetries && fetchCountRef.current <= maxRetries) {
        fetchCountRef.current++;
        console.log(`[useCurrentUser] Network error, retrying (${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 300));
        fetchUser(retryCount + 1);
        return;
      }

      console.error('[useCurrentUser] Error fetching user:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      if (!userRef.current) {
        setUser(null);
      }
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    isMounted.current = true;
    fetchCountRef.current = 0;
    userRef.current = user;
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

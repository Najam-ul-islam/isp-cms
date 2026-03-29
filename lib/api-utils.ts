import { redirect } from 'next/navigation';

// Function to make authenticated API requests with proper error handling
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  } as Record<string, string>;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });

  // Handle 401 Unauthorized - token expired or invalid
  if (response.status === 401) {
    // Clear the expired token
    localStorage.removeItem('token');
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return response; // Return the response for further processing if needed
  }

  return response;
}

// Alternative version for server-side redirects
export async function authenticatedFetchWithRedirect(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  } as Record<string, string>;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });

  // Handle 401 Unauthorized - token expired or invalid
  if (response.status === 401) {
    // Clear the expired token
    localStorage.removeItem('token');
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    // For client-side, redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }

    return response;
  }

  return response;
}
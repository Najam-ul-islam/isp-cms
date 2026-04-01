// lib/cache.ts
// Simple in-memory cache for dashboard data

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class InMemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  set<T>(key: string, data: T, ttl: number = 30000): void { // Default 30 seconds TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const cache = new InMemoryCache();

// Create cache key for dashboard stats
export const getDashboardStatsCacheKey = (companyId: string, userId: string) => {
  return `dashboard-stats:${companyId}:${userId}`;
};
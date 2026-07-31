import { LRUCache } from 'lru-cache';

// Rate Limiter: Max 10 requests per IP per hour
export const rateLimitCache = new LRUCache<string, number>({
  max: 500, // Maximum number of IPs to track
  ttl: 1000 * 60 * 60, // 1 hour time-to-live
});

// Response Cache: Cache LLM analysis results for 24 hours
export const responseCache = new LRUCache<string, string>({
  max: 100, // Maximum number of company analyses to cache
  ttl: 1000 * 60 * 60 * 24, // 24 hours
});

export function checkRateLimit(ip: string): boolean {
  const currentUsage = rateLimitCache.get(ip) || 0;
  if (currentUsage >= 10) {
    return false; // Rate limit exceeded
  }
  rateLimitCache.set(ip, currentUsage + 1);
  return true; // Allowed
}

export function clearCache() {
  responseCache.clear();
  rateLimitCache.clear();
}

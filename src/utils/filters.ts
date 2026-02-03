import type { Session, Filters } from '../types';

/**
 * Apply filters to sessions list.
 * All filtering is done client-side on already loaded data.
 */
export function applyFilters(sessions: Session[], filters: Filters): Session[] {
  return sessions.filter(session => {
    // Check boolean filters - if enabled, session must have that issue
    if (filters.jsErrors && session.stats.jsErrors <= 0) {
      return false;
    }
    if (filters.failedRequests && session.stats.failedRequests <= 0) {
      return false;
    }
    if (filters.pendingRequests && session.stats.pendingRequests <= 0) {
      return false;
    }
    if (filters.rageClicks && session.stats.rageClicks <= 0) {
      return false;
    }
    if (filters.deadClicks && session.stats.deadClicks <= 0) {
      return false;
    }
    if (filters.corrupted && !session.flags.corrupted) {
      return false;
    }

    // URL pattern filter (substring or regex)
    if (filters.urlPattern) {
      const pattern = filters.urlPattern;
      const matchesEntry = matchesUrlPattern(session.entryUrl, pattern);
      const matchesLast = matchesUrlPattern(session.lastRoute, pattern);

      if (!matchesEntry && !matchesLast) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Match URL against pattern.
 * Supports both substring match and regex.
 */
function matchesUrlPattern(url: string, pattern: string): boolean {
  if (!url || !pattern) return false;

  // Try as regex first if it looks like one
  if (pattern.startsWith('/') && pattern.endsWith('/')) {
    try {
      const regexPattern = pattern.slice(1, -1);
      const regex = new RegExp(regexPattern, 'i');
      return regex.test(url);
    } catch {
      // Invalid regex, fall through to substring match
    }
  }

  // Also try if it contains regex metacharacters
  if (/[.*+?^${}()|[\]\\]/.test(pattern)) {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(url);
    } catch {
      // Invalid regex, fall through to substring match
    }
  }

  // Default: case-insensitive substring match
  return url.toLowerCase().includes(pattern.toLowerCase());
}

/**
 * Check if any filter is active
 */
export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.jsErrors ||
    filters.failedRequests ||
    filters.pendingRequests ||
    filters.rageClicks ||
    filters.deadClicks ||
    filters.corrupted ||
    filters.urlPattern.length > 0
  );
}

import type { Session, SessionDetail, SessionEvent } from '../types';

/**
 * Session Clustering Algorithm
 *
 * Approach: Compare sessions using Levenshtein (edit) distance on event type sequences.
 *
 * Why Levenshtein:
 * - Handles insertions, deletions, substitutions
 * - Formal similarity metric with clear interpretation
 * - Works well for comparing sequences of different lengths
 *
 * Tradeoffs:
 * - O(n*m) complexity - acceptable for loaded sessions (~hundreds)
 * - For list view sessions, we estimate event types from available stats
 * - For full comparison, need complete session data with events
 */

export interface SessionSignature {
  sessionId: string;
  eventTypes: string[];
  length: number;
}

export interface SimilarSession {
  session: Session;
  similarity: number;
  distance: number;
}

export interface DiffResult {
  type: 'match' | 'insert' | 'delete' | 'substitute';
  sourceEvent?: string;
  targetEvent?: string;
  sourceIndex?: number;
  targetIndex?: number;
}

/**
 * Create a signature from a full session with events.
 */
export function createSignatureFromDetail(session: SessionDetail): SessionSignature {
  return {
    sessionId: session.id,
    eventTypes: session.events.map(e => e.type),
    length: session.events.length,
  };
}

/**
 * Estimate session signature from list data (without full events).
 * Uses available stats to approximate the event sequence.
 */
export function estimateSignatureFromList(session: Session): SessionSignature {
  const types: string[] = [];

  // Entry navigation
  types.push('nav.pageview');

  // Route changes
  if (session.lastRoute !== session.entryUrl) {
    types.push('nav.navigate');
  }

  // Errors (weighted by count, but capped to prevent dominance)
  const jsErrors = Math.min(session.stats.jsErrors, 5);
  const consoleErrors = Math.min(session.stats.consoleErrors, 3);
  for (let i = 0; i < jsErrors; i++) types.push('error.js');
  for (let i = 0; i < consoleErrors; i++) types.push('console.error');

  // Network issues
  const failedRequests = Math.min(session.stats.failedRequests, 5);
  const pendingRequests = Math.min(session.stats.pendingRequests, 3);
  for (let i = 0; i < failedRequests; i++) types.push('net.error');
  for (let i = 0; i < pendingRequests; i++) types.push('net.request');

  // UX issues
  const rageClicks = Math.min(session.stats.rageClicks, 3);
  const deadClicks = Math.min(session.stats.deadClicks, 3);
  for (let i = 0; i < rageClicks; i++) types.push('ui.rage_click');
  for (let i = 0; i < deadClicks; i++) types.push('ui.dead_click');

  return {
    sessionId: session.id,
    eventTypes: types,
    length: session.eventCount,
  };
}

/**
 * Calculate Levenshtein (edit) distance between two sequences.
 * Returns the minimum number of edits (insert/delete/substitute) needed
 * to transform sequence A into sequence B.
 */
export function levenshteinDistance(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;

  // Create matrix
  const matrix: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize first column
  for (let i = 0; i <= m; i++) {
    matrix[i][0] = i;
  }

  // Initialize first row
  for (let j = 0; j <= n; j++) {
    matrix[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[m][n];
}

/**
 * Calculate similarity score (0 to 1) from Levenshtein distance.
 * 1 = identical, 0 = completely different
 */
export function calculateSimilarity(distance: number, maxLength: number): number {
  if (maxLength === 0) return 1;
  return Math.max(0, 1 - distance / maxLength);
}

/**
 * Find sessions similar to a target session.
 *
 * @param targetSignature - Signature of the session to compare against
 * @param sessions - List of sessions to search
 * @param threshold - Minimum similarity (0-1) to include in results
 * @param maxResults - Maximum number of results to return
 */
export function findSimilarSessions(
  targetSignature: SessionSignature,
  sessions: Session[],
  threshold: number = 0.5,
  maxResults: number = 10
): SimilarSession[] {
  const results: SimilarSession[] = [];

  for (const session of sessions) {
    // Skip the target session itself
    if (session.id === targetSignature.sessionId) continue;

    const candidateSignature = estimateSignatureFromList(session);
    const distance = levenshteinDistance(
      targetSignature.eventTypes,
      candidateSignature.eventTypes
    );

    const maxLength = Math.max(
      targetSignature.eventTypes.length,
      candidateSignature.eventTypes.length
    );
    const similarity = calculateSimilarity(distance, maxLength);

    if (similarity >= threshold) {
      results.push({ session, similarity, distance });
    }
  }

  // Sort by similarity (highest first)
  results.sort((a, b) => b.similarity - a.similarity);

  return results.slice(0, maxResults);
}

/**
 * Generate a diff between two event sequences.
 * Uses backtracking through the Levenshtein matrix.
 */
export function generateDiff(source: string[], target: string[]): DiffResult[] {
  const m = source.length;
  const n = target.length;

  // Build the matrix
  const matrix: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) matrix[i][0] = i;
  for (let j = 0; j <= n; j++) matrix[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (source[i - 1] === target[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  // Backtrack to generate diff
  const diff: DiffResult[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && source[i - 1] === target[j - 1]) {
      diff.unshift({
        type: 'match',
        sourceEvent: source[i - 1],
        targetEvent: target[j - 1],
        sourceIndex: i - 1,
        targetIndex: j - 1,
      });
      i--;
      j--;
    } else if (i > 0 && j > 0 && matrix[i][j] === matrix[i - 1][j - 1] + 1) {
      diff.unshift({
        type: 'substitute',
        sourceEvent: source[i - 1],
        targetEvent: target[j - 1],
        sourceIndex: i - 1,
        targetIndex: j - 1,
      });
      i--;
      j--;
    } else if (j > 0 && matrix[i][j] === matrix[i][j - 1] + 1) {
      diff.unshift({
        type: 'insert',
        targetEvent: target[j - 1],
        targetIndex: j - 1,
      });
      j--;
    } else {
      diff.unshift({
        type: 'delete',
        sourceEvent: source[i - 1],
        sourceIndex: i - 1,
      });
      i--;
    }
  }

  return diff;
}

/**
 * Simplify event type for display (remove prefix).
 */
export function simplifyEventType(type: string): string {
  const parts = type.split('.');
  return parts.length > 1 ? parts.slice(1).join('.') : type;
}

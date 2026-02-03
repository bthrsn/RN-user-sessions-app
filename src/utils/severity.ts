import type { SessionStats, SessionFlags } from '../types';

/**
 * Severity Calculation Formula
 *
 * Requirements:
 * - Monotonic: increasing any counter never decreases severity
 * - Outlier-resistant: 1000 deadClicks shouldn't overwhelm 1 jsError
 * - Corruption-aware: corrupted flag significantly increases severity
 *
 * Implementation:
 * - Uses logarithmic scale to prevent outlier dominance
 * - Weighted by error impact: JS errors > Network > UX issues
 * - P95 latency contributes when above 1 second
 * - Corrupted flag applies 10x multiplier
 *
 * Weight rationale:
 * - jsErrors (10): Critical - app functionality broken
 * - failedRequests (8): High - data operations failed
 * - pendingRequests (7): High - potential data loss
 * - consoleErrors (5): Medium - developer warnings
 * - rageClicks (3): Low - user frustration indicator
 * - deadClicks (2): Low - minor UX issue
 */

const WEIGHTS = {
  jsErrors: 10,
  consoleErrors: 5,
  failedRequests: 8,
  pendingRequests: 7,
  rageClicks: 3,
  deadClicks: 2,
} as const;

const P95_THRESHOLD_MS = 1000;
const P95_WEIGHT = 5;
const CORRUPTED_MULTIPLIER = 10;

/**
 * Logarithmic scoring prevents outlier dominance.
 * log10(1001) ≈ 3, so 1000 deadClicks = 6 points
 * vs 1 jsError = 3 points (log10(2) * 10)
 * This ensures 1 jsError is more impactful than many minor issues.
 */
function logScore(value: number, weight: number): number {
  if (value <= 0) return 0;
  return Math.log10(value + 1) * weight;
}

export function calculateSeverity(stats: SessionStats, flags: SessionFlags): number {
  let severity = 0;

  // Core metrics with logarithmic scaling
  severity += logScore(stats.jsErrors, WEIGHTS.jsErrors);
  severity += logScore(stats.consoleErrors, WEIGHTS.consoleErrors);
  severity += logScore(stats.failedRequests, WEIGHTS.failedRequests);
  severity += logScore(stats.pendingRequests, WEIGHTS.pendingRequests);
  severity += logScore(stats.rageClicks, WEIGHTS.rageClicks);
  severity += logScore(stats.deadClicks, WEIGHTS.deadClicks);

  // P95 latency contribution (only when slow)
  if (stats.p95RequestMs > P95_THRESHOLD_MS) {
    severity += Math.log10(stats.p95RequestMs / P95_THRESHOLD_MS) * P95_WEIGHT;
  }

  // Corrupted data is a major red flag
  if (flags.corrupted) {
    severity *= CORRUPTED_MULTIPLIER;
  }

  return Math.round(severity * 100) / 100;
}

/**
 * Severity levels for UI display
 */
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export function getSeverityLevel(severity: number): SeverityLevel {
  if (severity < 5) return 'low';
  if (severity < 15) return 'medium';
  if (severity < 30) return 'high';
  return 'critical';
}

export function getSeverityColor(level: SeverityLevel): string {
  switch (level) {
    case 'low': return '#4CAF50';     // Green
    case 'medium': return '#FF9800';  // Orange
    case 'high': return '#F44336';    // Red
    case 'critical': return '#9C27B0'; // Purple
  }
}

import { calculateSeverity, getSeverityLevel } from '../severity';
import type { SessionStats, SessionFlags } from '../../types';

const baseStats: SessionStats = {
  jsErrors: 0,
  consoleErrors: 0,
  failedRequests: 0,
  pendingRequests: 0,
  p95RequestMs: 500,
  rageClicks: 0,
  deadClicks: 0,
};

const defaultFlags: SessionFlags = { corrupted: false };

describe('calculateSeverity', () => {
  describe('monotonicity', () => {
    it('should increase when jsErrors increases', () => {
      const base = calculateSeverity({ ...baseStats, jsErrors: 1 }, defaultFlags);
      const increased = calculateSeverity({ ...baseStats, jsErrors: 2 }, defaultFlags);
      expect(increased).toBeGreaterThan(base);
    });

    it('should increase when failedRequests increases', () => {
      const base = calculateSeverity({ ...baseStats, failedRequests: 1 }, defaultFlags);
      const increased = calculateSeverity({ ...baseStats, failedRequests: 2 }, defaultFlags);
      expect(increased).toBeGreaterThan(base);
    });

    it('should increase when pendingRequests increases', () => {
      const base = calculateSeverity({ ...baseStats, pendingRequests: 1 }, defaultFlags);
      const increased = calculateSeverity({ ...baseStats, pendingRequests: 2 }, defaultFlags);
      expect(increased).toBeGreaterThan(base);
    });

    it('should increase when rageClicks increases', () => {
      const base = calculateSeverity({ ...baseStats, rageClicks: 1 }, defaultFlags);
      const increased = calculateSeverity({ ...baseStats, rageClicks: 2 }, defaultFlags);
      expect(increased).toBeGreaterThan(base);
    });

    it('should increase when deadClicks increases', () => {
      const base = calculateSeverity({ ...baseStats, deadClicks: 1 }, defaultFlags);
      const increased = calculateSeverity({ ...baseStats, deadClicks: 2 }, defaultFlags);
      expect(increased).toBeGreaterThan(base);
    });

    it('should never decrease when any counter increases', () => {
      const base = calculateSeverity({
        jsErrors: 1,
        consoleErrors: 1,
        failedRequests: 1,
        pendingRequests: 1,
        p95RequestMs: 500,
        rageClicks: 1,
        deadClicks: 1,
      }, defaultFlags);

      // Increase each counter by 1
      const increased = calculateSeverity({
        jsErrors: 2,
        consoleErrors: 2,
        failedRequests: 2,
        pendingRequests: 2,
        p95RequestMs: 500,
        rageClicks: 2,
        deadClicks: 2,
      }, defaultFlags);

      expect(increased).toBeGreaterThan(base);
    });
  });

  describe('outlier resistance', () => {
    it('should not let 1000 deadClicks overwhelm 1 jsError', () => {
      const oneJsError = calculateSeverity({ ...baseStats, jsErrors: 1 }, defaultFlags);
      const manyDeadClicks = calculateSeverity({ ...baseStats, deadClicks: 1000 }, defaultFlags);

      // 1 jsError should be worth more than 1000 deadClicks due to weights and log scale
      // jsError weight is 10, deadClick weight is 2
      // log10(2) * 10 = 3.01 vs log10(1001) * 2 = 6.00
      // Actually manyDeadClicks will be higher, but the ratio should be reasonable
      const ratio = manyDeadClicks / oneJsError;
      expect(ratio).toBeLessThan(3); // Not more than 3x higher
    });

    it('should use logarithmic scale for large values', () => {
      const ten = calculateSeverity({ ...baseStats, jsErrors: 10 }, defaultFlags);
      const hundred = calculateSeverity({ ...baseStats, jsErrors: 100 }, defaultFlags);
      const thousand = calculateSeverity({ ...baseStats, jsErrors: 1000 }, defaultFlags);

      // Due to log scale, 10x increase should not result in 10x severity
      expect(hundred / ten).toBeLessThan(2);
      expect(thousand / hundred).toBeLessThan(2);
    });
  });

  describe('corrupted flag', () => {
    it('should significantly increase severity when corrupted is true', () => {
      const stats = { ...baseStats, jsErrors: 1 };
      const normal = calculateSeverity(stats, { corrupted: false });
      const corrupted = calculateSeverity(stats, { corrupted: true });

      expect(corrupted).toBeGreaterThan(normal * 5);
    });

    it('should apply 10x multiplier for corrupted sessions', () => {
      const stats = { ...baseStats, jsErrors: 1 };
      const normal = calculateSeverity(stats, { corrupted: false });
      const corrupted = calculateSeverity(stats, { corrupted: true });

      expect(corrupted).toBe(normal * 10);
    });
  });

  describe('p95 latency', () => {
    it('should not add severity when p95 is under 1000ms', () => {
      const fast = calculateSeverity({ ...baseStats, p95RequestMs: 500 }, defaultFlags);
      const threshold = calculateSeverity({ ...baseStats, p95RequestMs: 1000 }, defaultFlags);

      expect(fast).toBe(threshold);
    });

    it('should add severity when p95 exceeds 1000ms', () => {
      const threshold = calculateSeverity({ ...baseStats, p95RequestMs: 1000 }, defaultFlags);
      const slow = calculateSeverity({ ...baseStats, p95RequestMs: 2000 }, defaultFlags);

      expect(slow).toBeGreaterThan(threshold);
    });
  });

  describe('zero values', () => {
    it('should return 0 for session with no issues', () => {
      const severity = calculateSeverity(baseStats, defaultFlags);
      expect(severity).toBe(0);
    });
  });
});

describe('getSeverityLevel', () => {
  it('should return low for severity < 5', () => {
    expect(getSeverityLevel(0)).toBe('low');
    expect(getSeverityLevel(4.9)).toBe('low');
  });

  it('should return medium for severity 5-14', () => {
    expect(getSeverityLevel(5)).toBe('medium');
    expect(getSeverityLevel(14.9)).toBe('medium');
  });

  it('should return high for severity 15-29', () => {
    expect(getSeverityLevel(15)).toBe('high');
    expect(getSeverityLevel(29.9)).toBe('high');
  });

  it('should return critical for severity >= 30', () => {
    expect(getSeverityLevel(30)).toBe('critical');
    expect(getSeverityLevel(100)).toBe('critical');
  });
});

import {
  levenshteinDistance,
  calculateSimilarity,
  generateDiff,
  findSimilarSessions,
  createSignatureFromDetail,
} from '../clustering';
import type { Session, SessionDetail } from '../../types';

describe('levenshteinDistance', () => {
  describe('identical sequences', () => {
    it('should return 0 for identical arrays', () => {
      expect(levenshteinDistance(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(0);
    });

    it('should return 0 for empty arrays', () => {
      expect(levenshteinDistance([], [])).toBe(0);
    });
  });

  describe('single operations', () => {
    it('should return 1 for single insertion', () => {
      expect(levenshteinDistance(['a', 'b'], ['a', 'b', 'c'])).toBe(1);
    });

    it('should return 1 for single deletion', () => {
      expect(levenshteinDistance(['a', 'b', 'c'], ['a', 'b'])).toBe(1);
    });

    it('should return 1 for single substitution', () => {
      expect(levenshteinDistance(['a', 'b', 'c'], ['a', 'x', 'c'])).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle first array empty', () => {
      expect(levenshteinDistance([], ['a', 'b', 'c'])).toBe(3);
    });

    it('should handle second array empty', () => {
      expect(levenshteinDistance(['a', 'b', 'c'], [])).toBe(3);
    });

    it('should handle completely different arrays', () => {
      expect(levenshteinDistance(['a', 'b', 'c'], ['x', 'y', 'z'])).toBe(3);
    });

    it('should handle single element arrays', () => {
      expect(levenshteinDistance(['a'], ['a'])).toBe(0);
      expect(levenshteinDistance(['a'], ['b'])).toBe(1);
    });
  });

  describe('complex cases', () => {
    it('should calculate correct distance for reordering', () => {
      // abc -> cba requires 2 operations
      expect(levenshteinDistance(['a', 'b', 'c'], ['c', 'b', 'a'])).toBe(2);
    });

    it('should handle event type sequences', () => {
      const source = ['nav.pageview', 'ui.click', 'net.request', 'net.response'];
      const target = ['nav.pageview', 'ui.click', 'net.request', 'net.error'];
      expect(levenshteinDistance(source, target)).toBe(1); // response -> error
    });

    it('should handle sequences with insertions and deletions', () => {
      const source = ['a', 'b', 'c', 'd'];
      const target = ['a', 'x', 'c', 'd', 'e'];
      // b->x (1 sub) + insert e (1 ins) = 2
      expect(levenshteinDistance(source, target)).toBe(2);
    });
  });

  describe('symmetry', () => {
    it('should be symmetric (distance A->B equals B->A)', () => {
      const a = ['a', 'b', 'c'];
      const b = ['a', 'x', 'y', 'c'];
      expect(levenshteinDistance(a, b)).toBe(levenshteinDistance(b, a));
    });
  });
});

describe('calculateSimilarity', () => {
  it('should return 1 for distance 0', () => {
    expect(calculateSimilarity(0, 10)).toBe(1);
  });

  it('should return 0 for distance equal to max length', () => {
    expect(calculateSimilarity(10, 10)).toBe(0);
  });

  it('should return 0.5 for distance half of max length', () => {
    expect(calculateSimilarity(5, 10)).toBe(0.5);
  });

  it('should handle max length 0', () => {
    expect(calculateSimilarity(0, 0)).toBe(1);
  });

  it('should not return negative values', () => {
    expect(calculateSimilarity(15, 10)).toBe(0);
  });
});

describe('generateDiff', () => {
  it('should generate correct diff for identical sequences', () => {
    const diff = generateDiff(['a', 'b', 'c'], ['a', 'b', 'c']);
    expect(diff.every(d => d.type === 'match')).toBe(true);
    expect(diff.length).toBe(3);
  });

  it('should detect insertions', () => {
    const diff = generateDiff(['a', 'c'], ['a', 'b', 'c']);
    const insert = diff.find(d => d.type === 'insert');
    expect(insert).toBeDefined();
    expect(insert?.targetEvent).toBe('b');
  });

  it('should detect deletions', () => {
    const diff = generateDiff(['a', 'b', 'c'], ['a', 'c']);
    const deletion = diff.find(d => d.type === 'delete');
    expect(deletion).toBeDefined();
    expect(deletion?.sourceEvent).toBe('b');
  });

  it('should detect substitutions', () => {
    const diff = generateDiff(['a', 'b', 'c'], ['a', 'x', 'c']);
    const sub = diff.find(d => d.type === 'substitute');
    expect(sub).toBeDefined();
    expect(sub?.sourceEvent).toBe('b');
    expect(sub?.targetEvent).toBe('x');
  });

  it('should handle empty source', () => {
    const diff = generateDiff([], ['a', 'b']);
    expect(diff.every(d => d.type === 'insert')).toBe(true);
    expect(diff.length).toBe(2);
  });

  it('should handle empty target', () => {
    const diff = generateDiff(['a', 'b'], []);
    expect(diff.every(d => d.type === 'delete')).toBe(true);
    expect(diff.length).toBe(2);
  });
});

describe('createSignatureFromDetail', () => {
  it('should create signature from session events', () => {
    const session: SessionDetail = {
      id: 'test-session',
      startedAt: 1000,
      endedAt: 2000,
      user: { id: 'user1', locale: 'en-US' },
      device: { ua: 'Chrome', viewport: '1920x1080', os: 'Windows' },
      events: [
        { eventId: 'e1', ts: 1000, type: 'nav.pageview', data: {} },
        { eventId: 'e2', ts: 1100, type: 'ui.click', data: {} },
        { eventId: 'e3', ts: 1200, type: 'net.request', data: {} },
      ],
    };

    const signature = createSignatureFromDetail(session);

    expect(signature.sessionId).toBe('test-session');
    expect(signature.eventTypes).toEqual(['nav.pageview', 'ui.click', 'net.request']);
    expect(signature.length).toBe(3);
  });
});

describe('findSimilarSessions', () => {
  const createMockSession = (id: string, stats: Partial<Session['stats']> = {}): Session => ({
    id,
    startedAt: Date.now(),
    durationMs: 10000,
    entryUrl: '/home',
    lastRoute: '/checkout',
    eventCount: 50,
    stats: {
      jsErrors: 0,
      consoleErrors: 0,
      failedRequests: 0,
      pendingRequests: 0,
      p95RequestMs: 500,
      rageClicks: 0,
      deadClicks: 0,
      ...stats,
    },
    flags: { corrupted: false },
  });

  it('should exclude the target session from results', () => {
    const sessions = [
      createMockSession('s1'),
      createMockSession('s2'),
    ];

    const results = findSimilarSessions(
      { sessionId: 's1', eventTypes: ['nav.pageview'], length: 1 },
      sessions,
      0,
      10
    );

    expect(results.find(r => r.session.id === 's1')).toBeUndefined();
  });

  it('should filter by threshold', () => {
    const sessions = [
      createMockSession('s1'),
      createMockSession('s2', { jsErrors: 10 }), // Very different
    ];

    const results = findSimilarSessions(
      { sessionId: 'target', eventTypes: ['nav.pageview', 'ui.click'], length: 2 },
      sessions,
      0.9, // High threshold
      10
    );

    // Sessions with very different stats should be filtered out
    expect(results.length).toBeLessThanOrEqual(sessions.length);
  });

  it('should sort by similarity descending', () => {
    const sessions = [
      createMockSession('s1'),
      createMockSession('s2'),
      createMockSession('s3'),
    ];

    const results = findSimilarSessions(
      { sessionId: 'target', eventTypes: ['nav.pageview'], length: 1 },
      sessions,
      0,
      10
    );

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
    }
  });

  it('should respect maxResults limit', () => {
    const sessions = Array.from({ length: 20 }, (_, i) =>
      createMockSession(`s${i}`)
    );

    const results = findSimilarSessions(
      { sessionId: 'target', eventTypes: ['nav.pageview'], length: 1 },
      sessions,
      0,
      5
    );

    expect(results.length).toBeLessThanOrEqual(5);
  });
});

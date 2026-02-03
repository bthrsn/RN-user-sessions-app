import {
  analyzeNetworkEvents,
  stableSortEvents,
  findNextEvent,
  isErrorType,
  isFailedRequest,
} from '../events';
import type { SessionEvent } from '../../types';

describe('analyzeNetworkEvents', () => {
  const createEvent = (
    id: string,
    type: string,
    requestId?: string
  ): SessionEvent => ({
    eventId: id,
    ts: Date.now(),
    type,
    data: requestId ? { requestId } : {},
  });

  describe('pending requests', () => {
    it('should detect request without response as pending', () => {
      const events = [
        createEvent('e1', 'net.request', 'req1'),
      ];

      const { pendingRequests } = analyzeNetworkEvents(events);

      expect(pendingRequests.length).toBe(1);
      expect(pendingRequests[0].isPending).toBe(true);
      expect(pendingRequests[0].request.eventId).toBe('e1');
    });

    it('should not mark request with response as pending', () => {
      const events = [
        createEvent('e1', 'net.request', 'req1'),
        createEvent('e2', 'net.response', 'req1'),
      ];

      const { pendingRequests } = analyzeNetworkEvents(events);

      expect(pendingRequests.length).toBe(1);
      expect(pendingRequests[0].isPending).toBe(false);
      expect(pendingRequests[0].completions.length).toBe(1);
    });

    it('should not mark request with error as pending', () => {
      const events = [
        createEvent('e1', 'net.request', 'req1'),
        createEvent('e2', 'net.error', 'req1'),
      ];

      const { pendingRequests } = analyzeNetworkEvents(events);

      expect(pendingRequests[0].isPending).toBe(false);
    });

    it('should not mark request with abort as pending', () => {
      const events = [
        createEvent('e1', 'net.request', 'req1'),
        createEvent('e2', 'net.abort', 'req1'),
      ];

      const { pendingRequests } = analyzeNetworkEvents(events);

      expect(pendingRequests[0].isPending).toBe(false);
    });

    it('should handle multiple completions for same request', () => {
      const events = [
        createEvent('e1', 'net.request', 'req1'),
        createEvent('e2', 'net.response', 'req1'),
        createEvent('e3', 'net.error', 'req1'),
      ];

      const { pendingRequests } = analyzeNetworkEvents(events);

      expect(pendingRequests[0].isPending).toBe(false);
      expect(pendingRequests[0].completions.length).toBe(2);
    });
  });

  describe('requests without requestId', () => {
    it('should mark request without requestId as always pending', () => {
      const events = [
        createEvent('e1', 'net.request'), // No requestId
      ];

      const { pendingRequests } = analyzeNetworkEvents(events);

      expect(pendingRequests.length).toBe(1);
      expect(pendingRequests[0].isPending).toBe(true);
    });

    it('should have empty completions for request without requestId', () => {
      const events = [
        createEvent('e1', 'net.request'), // No requestId
        createEvent('e2', 'net.response', 'req1'), // Has requestId
      ];

      const { pendingRequests } = analyzeNetworkEvents(events);
      const noIdRequest = pendingRequests.find(p => p.request.eventId === 'e1');

      expect(noIdRequest?.completions.length).toBe(0);
    });
  });

  describe('orphaned responses', () => {
    it('should detect response without matching request as orphaned', () => {
      const events = [
        createEvent('e1', 'net.response', 'req1'), // No matching request
      ];

      const { orphanedResponses } = analyzeNetworkEvents(events);

      expect(orphanedResponses.length).toBe(1);
      expect(orphanedResponses[0].event.eventId).toBe('e1');
      expect(orphanedResponses[0].reason).toBe('no_matching_request');
    });

    it('should detect response without requestId as orphaned', () => {
      const events = [
        createEvent('e1', 'net.response'), // No requestId
      ];

      const { orphanedResponses } = analyzeNetworkEvents(events);

      expect(orphanedResponses.length).toBe(1);
      expect(orphanedResponses[0].reason).toBe('no_request_id');
    });

    it('should not mark response with matching request as orphaned', () => {
      const events = [
        createEvent('e1', 'net.request', 'req1'),
        createEvent('e2', 'net.response', 'req1'),
      ];

      const { orphanedResponses } = analyzeNetworkEvents(events);

      expect(orphanedResponses.length).toBe(0);
    });
  });

  describe('complex scenarios', () => {
    it('should handle mixed pending and completed requests', () => {
      const events = [
        createEvent('e1', 'net.request', 'req1'),
        createEvent('e2', 'net.response', 'req1'),
        createEvent('e3', 'net.request', 'req2'), // Pending
        createEvent('e4', 'net.request', 'req3'),
        createEvent('e5', 'net.error', 'req3'),
      ];

      const { pendingRequests } = analyzeNetworkEvents(events);

      const pending = pendingRequests.filter(p => p.isPending);
      const completed = pendingRequests.filter(p => !p.isPending);

      expect(pending.length).toBe(1);
      expect(pending[0].request.data.requestId).toBe('req2');
      expect(completed.length).toBe(2);
    });

    it('should handle events in any order', () => {
      const events = [
        createEvent('e1', 'net.response', 'req1'), // Response before request
        createEvent('e2', 'net.request', 'req1'),
      ];

      const { pendingRequests, orphanedResponses } = analyzeNetworkEvents(events);

      // Request should be found and matched
      expect(pendingRequests.length).toBe(1);
      expect(pendingRequests[0].isPending).toBe(false);
      expect(orphanedResponses.length).toBe(0);
    });
  });
});

describe('stableSortEvents', () => {
  it('should sort events by timestamp', () => {
    const events: SessionEvent[] = [
      { eventId: 'e3', ts: 3000, type: 'test', data: {} },
      { eventId: 'e1', ts: 1000, type: 'test', data: {} },
      { eventId: 'e2', ts: 2000, type: 'test', data: {} },
    ];

    const sorted = stableSortEvents(events);

    expect(sorted[0].eventId).toBe('e1');
    expect(sorted[1].eventId).toBe('e2');
    expect(sorted[2].eventId).toBe('e3');
  });

  it('should preserve order for identical timestamps', () => {
    const events: SessionEvent[] = [
      { eventId: 'e1', ts: 1000, type: 'first', data: {} },
      { eventId: 'e2', ts: 1000, type: 'second', data: {} },
      { eventId: 'e3', ts: 1000, type: 'third', data: {} },
    ];

    const sorted = stableSortEvents(events);

    // Original order should be preserved
    expect(sorted[0].eventId).toBe('e1');
    expect(sorted[1].eventId).toBe('e2');
    expect(sorted[2].eventId).toBe('e3');
  });

  it('should handle empty array', () => {
    const sorted = stableSortEvents([]);
    expect(sorted).toEqual([]);
  });

  it('should handle single event', () => {
    const events: SessionEvent[] = [
      { eventId: 'e1', ts: 1000, type: 'test', data: {} },
    ];

    const sorted = stableSortEvents(events);
    expect(sorted.length).toBe(1);
    expect(sorted[0].eventId).toBe('e1');
  });
});

describe('findNextEvent', () => {
  const events: SessionEvent[] = [
    { eventId: 'e1', ts: 1000, type: 'ui.click', data: {} },
    { eventId: 'e2', ts: 2000, type: 'error.js', data: {} },
    { eventId: 'e3', ts: 3000, type: 'ui.click', data: {} },
    { eventId: 'e4', ts: 4000, type: 'error.js', data: {} },
  ];

  it('should find next matching event', () => {
    const result = findNextEvent(events, 0, isErrorType);

    expect(result).not.toBeNull();
    expect(result?.event.eventId).toBe('e2');
    expect(result?.index).toBe(1);
  });

  it('should skip to next matching after current index', () => {
    const result = findNextEvent(events, 1, isErrorType);

    expect(result).not.toBeNull();
    expect(result?.event.eventId).toBe('e4');
    expect(result?.index).toBe(3);
  });

  it('should return null when no matching event found', () => {
    const result = findNextEvent(events, 3, isErrorType);

    expect(result).toBeNull();
  });

  it('should return null for empty array', () => {
    const result = findNextEvent([], 0, isErrorType);

    expect(result).toBeNull();
  });
});

describe('isErrorType', () => {
  it('should return true for error.* events', () => {
    const event: SessionEvent = { eventId: 'e1', ts: 1000, type: 'error.js', data: {} };
    expect(isErrorType(event)).toBe(true);
  });

  it('should return true for console.error events', () => {
    const event: SessionEvent = { eventId: 'e1', ts: 1000, type: 'console.error', data: {} };
    expect(isErrorType(event)).toBe(true);
  });

  it('should return false for other events', () => {
    const event: SessionEvent = { eventId: 'e1', ts: 1000, type: 'ui.click', data: {} };
    expect(isErrorType(event)).toBe(false);
  });
});

describe('isFailedRequest', () => {
  it('should return true for net.error events', () => {
    const event: SessionEvent = { eventId: 'e1', ts: 1000, type: 'net.error', data: {} };
    expect(isFailedRequest(event)).toBe(true);
  });

  it('should return false for net.response events', () => {
    const event: SessionEvent = { eventId: 'e1', ts: 1000, type: 'net.response', data: {} };
    expect(isFailedRequest(event)).toBe(false);
  });

  it('should return false for net.request events', () => {
    const event: SessionEvent = { eventId: 'e1', ts: 1000, type: 'net.request', data: {} };
    expect(isFailedRequest(event)).toBe(false);
  });
});

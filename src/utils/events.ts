import type { SessionEvent, EventCategory, NetworkEvent, PendingRequest, OrphanedResponse } from '../types';
import { getEventCategory, isNetworkEvent } from '../types';

/**
 * Stable sort for events with identical timestamps.
 * Maintains original order when timestamps are equal.
 */
export function stableSortEvents(events: SessionEvent[]): SessionEvent[] {
  const indexed = events.map((event, index) => ({ event, index }));

  indexed.sort((a, b) => {
    const timeDiff = a.event.ts - b.event.ts;
    return timeDiff !== 0 ? timeDiff : a.index - b.index;
  });

  return indexed.map(({ event }) => event);
}

/**
 * Group events by category for timeline lanes.
 */
export function groupEventsByCategory(events: SessionEvent[]): Map<EventCategory, SessionEvent[]> {
  const groups = new Map<EventCategory, SessionEvent[]>();

  const categories: EventCategory[] = ['nav', 'ui', 'net', 'error', 'perf', 'unknown'];
  categories.forEach(cat => groups.set(cat, []));

  events.forEach(event => {
    const category = getEventCategory(event.type);
    groups.get(category)!.push(event);
  });

  return groups;
}

/**
 * Filter events by enabled categories.
 */
export function filterEventsByCategories(
  events: SessionEvent[],
  enabledCategories: Set<EventCategory>
): SessionEvent[] {
  return events.filter(event => {
    const category = getEventCategory(event.type);
    return enabledCategories.has(category);
  });
}

/**
 * Detect pending requests and orphaned responses.
 * Handles edge cases:
 * - Requests without requestId → always pending
 * - Responses without matching request → orphaned
 * - Multiple completions per request → show all, not pending
 */
export function analyzeNetworkEvents(events: SessionEvent[]): {
  pendingRequests: PendingRequest[];
  orphanedResponses: OrphanedResponse[];
} {
  const networkEvents = events.filter(isNetworkEvent) as NetworkEvent[];

  const requests = new Map<string, NetworkEvent>();
  const completions = new Map<string, NetworkEvent[]>();
  const noIdRequests: NetworkEvent[] = [];
  const orphanedResponses: OrphanedResponse[] = [];

  // First pass: group events
  networkEvents.forEach(event => {
    const requestId = event.data.requestId;

    if (event.type === 'net.request') {
      if (requestId) {
        requests.set(requestId, event);
      } else {
        noIdRequests.push(event);
      }
    } else {
      // response, error, abort
      if (requestId) {
        if (!completions.has(requestId)) {
          completions.set(requestId, []);
        }
        completions.get(requestId)!.push(event);
      } else {
        // Response without requestId - orphaned
        orphanedResponses.push({
          event,
          reason: 'no_request_id',
        });
      }
    }
  });

  // Check for orphaned responses (have requestId but no matching request)
  completions.forEach((comps, requestId) => {
    if (!requests.has(requestId)) {
      comps.forEach(event => {
        orphanedResponses.push({
          event,
          reason: 'no_matching_request',
        });
      });
    }
  });

  // Build pending requests list
  const pendingRequests: PendingRequest[] = [];

  // Requests with ID
  requests.forEach((request, requestId) => {
    const requestCompletions = completions.get(requestId) || [];
    pendingRequests.push({
      request,
      completions: requestCompletions,
      isPending: requestCompletions.length === 0,
    });
  });

  // Requests without ID are always pending
  noIdRequests.forEach(request => {
    pendingRequests.push({
      request,
      completions: [],
      isPending: true,
    });
  });

  return { pendingRequests, orphanedResponses };
}

/**
 * Find the next event matching a predicate, starting from current index.
 * Returns null if not found.
 */
export function findNextEvent(
  events: SessionEvent[],
  currentIndex: number,
  predicate: (event: SessionEvent) => boolean
): { event: SessionEvent; index: number } | null {
  for (let i = currentIndex + 1; i < events.length; i++) {
    if (predicate(events[i])) {
      return { event: events[i], index: i };
    }
  }
  return null;
}

/**
 * Check if event is an error type.
 */
export function isErrorType(event: SessionEvent): boolean {
  return event.type.startsWith('error.') || event.type.startsWith('console.error');
}

/**
 * Check if event is a failed request.
 */
export function isFailedRequest(event: SessionEvent): boolean {
  return event.type === 'net.error';
}

/**
 * Get time range of events.
 */
export function getEventTimeRange(events: SessionEvent[]): { start: number; end: number } | null {
  if (events.length === 0) return null;

  let start = events[0].ts;
  let end = events[0].ts;

  events.forEach(event => {
    if (event.ts < start) start = event.ts;
    if (event.ts > end) end = event.ts;
  });

  return { start, end };
}

/**
 * Calculate position percentage for an event on the timeline.
 */
export function getEventPosition(ts: number, start: number, end: number): number {
  if (end === start) return 0;
  return ((ts - start) / (end - start)) * 100;
}

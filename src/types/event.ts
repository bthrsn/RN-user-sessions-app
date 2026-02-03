export type EventCategory = 'nav' | 'ui' | 'net' | 'error' | 'perf' | 'unknown';

export interface NetworkEventData {
  requestId?: string;
  url?: string;
  method?: string;
  status?: number;
  duration?: number;
  [key: string]: unknown;
}

export interface NetworkEvent {
  eventId: string;
  ts: number;
  type: 'net.request' | 'net.response' | 'net.error' | 'net.abort';
  data: NetworkEventData;
}

export interface PendingRequest {
  request: NetworkEvent;
  completions: NetworkEvent[];
  isPending: boolean;
}

export interface OrphanedResponse {
  event: NetworkEvent;
  reason: 'no_matching_request' | 'no_request_id';
}

export function getEventCategory(type: string): EventCategory {
  if (type.startsWith('nav.')) return 'nav';
  if (type.startsWith('ui.')) return 'ui';
  if (type.startsWith('net.')) return 'net';
  if (type.startsWith('error.') || type.startsWith('console.')) return 'error';
  if (type.startsWith('perf.')) return 'perf';
  return 'unknown';
}

export function isNetworkEvent(event: { type: string }): boolean {
  return event.type.startsWith('net.');
}

export function isErrorEvent(event: { type: string }): boolean {
  return event.type.startsWith('error.') || event.type.startsWith('console.');
}

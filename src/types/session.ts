export interface SessionStats {
  jsErrors: number;
  consoleErrors: number;
  failedRequests: number;
  pendingRequests: number;
  p95RequestMs: number;
  rageClicks: number;
  deadClicks: number;
}

export interface SessionFlags {
  corrupted: boolean;
}

export interface Session {
  id: string;
  startedAt: number;
  durationMs: number;
  entryUrl: string;
  lastRoute: string;
  eventCount: number;
  stats: SessionStats;
  flags: SessionFlags;
  // Computed client-side
  severity?: number;
}

export interface SessionUser {
  id: string;
  locale: string;
}

export interface SessionDevice {
  ua: string;
  viewport: string;
  os: string;
}

export interface SessionDetail {
  id: string;
  startedAt: number;
  endedAt: number;
  user: SessionUser;
  device: SessionDevice;
  events: SessionEvent[];
  // From list API
  stats?: SessionStats;
  flags?: SessionFlags;
}

export interface SessionEvent {
  eventId: string;
  ts: number;
  type: string;
  data: Record<string, unknown>;
}

export interface SessionListResponse {
  page: number;
  limit: number;
  total: number;
  items: Session[];
}

export type SortType = 'startedAt' | 'severity';

export interface Filters {
  jsErrors: boolean;
  failedRequests: boolean;
  pendingRequests: boolean;
  rageClicks: boolean;
  deadClicks: boolean;
  corrupted: boolean;
  urlPattern: string;
}

export const defaultFilters: Filters = {
  jsErrors: false,
  failedRequests: false,
  pendingRequests: false,
  rageClicks: false,
  deadClicks: false,
  corrupted: false,
  urlPattern: '',
};

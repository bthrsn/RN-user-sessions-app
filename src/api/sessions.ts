import { fetchWithRetry } from './client';
import type { Session, SessionDetail, SessionListResponse } from '../types';

export async function fetchSessionList(
  page: number = 1,
  limit: number = 50
): Promise<SessionListResponse> {
  return fetchWithRetry<SessionListResponse>(
    `/session/list?page=${page}&limit=${limit}`
  );
}

export async function fetchSessionDetail(id: string): Promise<SessionDetail> {
  return fetchWithRetry<SessionDetail>(`/session/${id}`);
}

// Mock data for development/testing
export function getMockSessionList(page: number, limit: number): SessionListResponse {
  const total = 250;
  const startIndex = (page - 1) * limit;
  const items: Session[] = [];

  for (let i = 0; i < limit && startIndex + i < total; i++) {
    const index = startIndex + i;
    const hasErrors = index % 5 === 0;
    const isCorrupted = index % 20 === 0;

    items.push({
      id: `s_${String(index + 1).padStart(8, '0')}`,
      startedAt: Date.now() - (index * 3600000),
      durationMs: 60000 + Math.random() * 300000,
      entryUrl: index % 3 === 0 ? '/checkout' : index % 2 === 0 ? '/product' : '/home',
      lastRoute: index % 4 === 0 ? '/payment' : '/checkout',
      eventCount: 100 + Math.floor(Math.random() * 2000),
      stats: {
        jsErrors: hasErrors ? Math.floor(Math.random() * 5) : 0,
        consoleErrors: hasErrors ? Math.floor(Math.random() * 3) : 0,
        failedRequests: hasErrors ? Math.floor(Math.random() * 4) : 0,
        pendingRequests: Math.floor(Math.random() * 2),
        p95RequestMs: 200 + Math.random() * 1500,
        rageClicks: Math.floor(Math.random() * 3),
        deadClicks: Math.floor(Math.random() * 5),
      },
      flags: { corrupted: isCorrupted },
    });
  }

  return { page, limit, total, items };
}

export function getMockSessionDetail(id: string): SessionDetail {
  const eventTypes = [
    'nav.pageview', 'nav.navigate',
    'ui.click', 'ui.scroll', 'ui.input',
    'net.request', 'net.response', 'net.error',
    'error.js', 'console.error', 'console.warn',
    'perf.lcp', 'perf.fcp',
  ];

  const events = [];
  const startTime = Date.now() - 300000;
  let requestId = 1;

  for (let i = 0; i < 50; i++) {
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const event: any = {
      eventId: `e_${String(i + 1).padStart(6, '0')}`,
      ts: startTime + (i * 5000) + Math.random() * 2000,
      type,
      data: { url: '/checkout' },
    };

    if (type === 'net.request') {
      event.data.requestId = `req_${requestId++}`;
      event.data.method = 'GET';
      event.data.url = '/api/data';
    }

    if (type === 'net.response' && requestId > 1) {
      event.data.requestId = `req_${requestId - 1}`;
      event.data.status = 200;
    }

    events.push(event);
  }

  return {
    id,
    startedAt: startTime,
    endedAt: startTime + 300000,
    user: { id: 'anon', locale: 'en-US' },
    device: { ua: 'Chrome/122 (Win)', viewport: '1440x900', os: 'Windows' },
    events,
  };
}

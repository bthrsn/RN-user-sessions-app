import { create } from 'zustand';
import type {
  Session,
  SessionDetail,
  Filters,
  SortType,
  EventCategory,
  SessionEvent,
} from '../types';
import { defaultFilters } from '../types';
import { getMockSessionList, getMockSessionDetail } from '../api';
import { calculateSeverity } from '../utils/severity';
import { applyFilters } from '../utils/filters';

interface SessionStore {
  // Data
  allSessions: Session[];
  currentSession: SessionDetail | null;
  isLoading: boolean;
  isLoadingDetail: boolean;
  error: Error | null;
  hasMore: boolean;
  totalSessions: number;

  // UI State - preserved across navigation
  filters: Filters;
  sorting: SortType;
  scrollPosition: number;
  currentPage: number;

  // Timeline State
  timelineFilters: Set<EventCategory>;
  selectedEvent: SessionEvent | null;

  // Actions
  loadMore: () => Promise<void>;
  fetchSession: (id: string) => Promise<void>;
  setFilters: (filters: Partial<Filters>) => void;
  clearFilters: () => void;
  setSorting: (sort: SortType) => void;
  setScrollPosition: (position: number) => void;
  toggleTimelineCategory: (category: EventCategory) => void;
  setSelectedEvent: (event: SessionEvent | null) => void;
  resetTimelineFilters: () => void;

  // Computed (as functions to avoid stale closures)
  getFilteredSessions: () => Session[];
  getSortedSessions: () => Session[];
}

const ALL_CATEGORIES: EventCategory[] = ['nav', 'ui', 'net', 'error', 'perf', 'unknown'];

export const useSessionStore = create<SessionStore>((set, get) => ({
  // Initial state
  allSessions: [],
  currentSession: null,
  isLoading: false,
  isLoadingDetail: false,
  error: null,
  hasMore: true,
  totalSessions: 0,

  filters: defaultFilters,
  sorting: 'startedAt',
  scrollPosition: 0,
  currentPage: 0,

  timelineFilters: new Set(ALL_CATEGORIES),
  selectedEvent: null,

  // Load more sessions (pagination)
  loadMore: async () => {
    const state = get();
    if (state.isLoading || !state.hasMore) return;

    set({ isLoading: true, error: null });

    try {
      const nextPage = state.currentPage + 1;
      // Using mock data for now - replace with actual API call
      const response = await Promise.resolve(getMockSessionList(nextPage, 50));

      // Calculate severity for each session
      const sessionsWithSeverity = response.items.map(session => ({
        ...session,
        severity: calculateSeverity(session.stats, session.flags),
      }));

      set({
        allSessions: [...state.allSessions, ...sessionsWithSeverity],
        currentPage: nextPage,
        totalSessions: response.total,
        hasMore: state.allSessions.length + response.items.length < response.total,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error : new Error('Failed to load sessions'),
        isLoading: false,
      });
    }
  },

  // Fetch single session details
  fetchSession: async (id: string) => {
    set({ isLoadingDetail: true, error: null });

    try {
      // Using mock data for now - replace with actual API call
      const detail = await Promise.resolve(getMockSessionDetail(id));

      // Merge stats/flags from list data if available
      const listSession = get().allSessions.find(s => s.id === id);
      const enrichedDetail = {
        ...detail,
        stats: listSession?.stats,
        flags: listSession?.flags,
      };

      set({
        currentSession: enrichedDetail,
        isLoadingDetail: false,
        selectedEvent: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error : new Error('Failed to load session'),
        isLoadingDetail: false,
      });
    }
  },

  // Filter actions
  setFilters: (newFilters: Partial<Filters>) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  clearFilters: () => {
    set({ filters: defaultFilters });
  },

  setSorting: (sorting: SortType) => {
    set({ sorting });
  },

  setScrollPosition: (scrollPosition: number) => {
    set({ scrollPosition });
  },

  // Timeline actions
  toggleTimelineCategory: (category: EventCategory) => {
    set(state => {
      const newFilters = new Set(state.timelineFilters);
      if (newFilters.has(category)) {
        newFilters.delete(category);
      } else {
        newFilters.add(category);
      }
      return { timelineFilters: newFilters };
    });
  },

  setSelectedEvent: (event: SessionEvent | null) => {
    set({ selectedEvent: event });
  },

  resetTimelineFilters: () => {
    set({ timelineFilters: new Set(ALL_CATEGORIES) });
  },

  // Computed values as functions
  getFilteredSessions: () => {
    const state = get();
    return applyFilters(state.allSessions, state.filters);
  },

  getSortedSessions: () => {
    const state = get();
    const filtered = applyFilters(state.allSessions, state.filters);

    return [...filtered].sort((a, b) => {
      if (state.sorting === 'severity') {
        // Higher severity first
        return (b.severity ?? 0) - (a.severity ?? 0);
      }
      // Newest first
      return b.startedAt - a.startedAt;
    });
  },
}));

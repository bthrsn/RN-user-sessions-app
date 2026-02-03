import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, ActivityIndicator, Chip, Button } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useCallback, useState } from 'react';
import { format } from 'date-fns';
import { useSessionStore } from '../../src/stores';
import {
  Timeline,
  CategoryFilters,
  EventDetails,
  EventNavigator,
  EmptyState,
  SessionDiff,
  SimilarSessionsList,
} from '../../src/components';
import type { SessionEvent, EventCategory } from '../../src/types';
import {
  stableSortEvents,
  groupEventsByCategory,
  filterEventsByCategories,
  analyzeNetworkEvents,
} from '../../src/utils/events';
import { getSeverityLevel, getSeverityColor } from '../../src/utils/severity';
import {
  createSignatureFromDetail,
  findSimilarSessions,
  generateDiff,
  estimateSignatureFromList,
  type SimilarSession,
} from '../../src/utils/clustering';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    currentSession,
    isLoadingDetail,
    error,
    timelineFilters,
    selectedEvent,
    fetchSession,
    toggleTimelineCategory,
    setSelectedEvent,
    allSessions,
  } = useSessionStore();

  const [currentEventIndex, setCurrentEventIndex] = useState(-1);
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarSessions, setSimilarSessions] = useState<SimilarSession[]>([]);
  const [selectedSimilar, setSelectedSimilar] = useState<SimilarSession | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch session details on mount
  useEffect(() => {
    if (id) {
      fetchSession(id);
    }
  }, [id]);

  // Get session info from list for stats/flags
  const listSession = useMemo(() => {
    return allSessions.find(s => s.id === id);
  }, [allSessions, id]);

  // Sort events with stable sort
  const sortedEvents = useMemo(() => {
    if (!currentSession?.events) return [];
    return stableSortEvents(currentSession.events);
  }, [currentSession?.events]);

  // Filter events by enabled categories
  const filteredEvents = useMemo(() => {
    return filterEventsByCategories(sortedEvents, timelineFilters);
  }, [sortedEvents, timelineFilters]);

  // Event counts by category
  const eventCounts = useMemo(() => {
    const groups = groupEventsByCategory(sortedEvents);
    const counts = new Map<EventCategory, number>();
    groups.forEach((events, category) => {
      counts.set(category, events.length);
    });
    return counts;
  }, [sortedEvents]);

  // Analyze network events for pending/orphaned
  const { pendingRequests, orphanedResponses } = useMemo(() => {
    return analyzeNetworkEvents(sortedEvents);
  }, [sortedEvents]);

  const pendingRequestIds = useMemo(() => {
    return new Set(pendingRequests.filter(p => p.isPending).map(p => p.request.eventId));
  }, [pendingRequests]);

  const orphanedResponseIds = useMemo(() => {
    return new Set(orphanedResponses.map(o => o.event.eventId));
  }, [orphanedResponses]);

  // Diff for selected similar session
  const diff = useMemo(() => {
    if (!currentSession || !selectedSimilar) return null;

    const sourceSignature = createSignatureFromDetail(currentSession);
    const targetSignature = estimateSignatureFromList(selectedSimilar.session);

    return generateDiff(sourceSignature.eventTypes, targetSignature.eventTypes);
  }, [currentSession, selectedSimilar]);

  const handleEventPress = useCallback((event: SessionEvent) => {
    setSelectedEvent(event);
    const index = filteredEvents.findIndex(e => e.eventId === event.eventId);
    setCurrentEventIndex(index);
  }, [filteredEvents, setSelectedEvent]);

  const handleNavigate = useCallback((event: SessionEvent, index: number) => {
    setSelectedEvent(event);
    setCurrentEventIndex(index);
  }, [setSelectedEvent]);

  const handleCloseDetails = useCallback(() => {
    setSelectedEvent(null);
    setCurrentEventIndex(-1);
  }, [setSelectedEvent]);

  const handleFindSimilar = useCallback(() => {
    if (!currentSession) return;

    setShowSimilar(true);
    setIsSearching(true);
    setSelectedSimilar(null);

    // Run search async to not block UI
    setTimeout(() => {
      const signature = createSignatureFromDetail(currentSession);
      const results = findSimilarSessions(signature, allSessions, 0.3, 15);
      setSimilarSessions(results);
      setIsSearching(false);
    }, 100);
  }, [currentSession, allSessions]);

  const handleCloseSimilar = useCallback(() => {
    setShowSimilar(false);
    setSelectedSimilar(null);
    setSimilarSessions([]);
  }, []);

  const handleSelectSimilar = useCallback((item: SimilarSession) => {
    setSelectedSimilar(item);
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text variant="bodyLarge" style={styles.error}>
          Error: {error.message}
        </Text>
      </View>
    );
  }

  if (isLoadingDetail || !currentSession) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading session...
        </Text>
      </View>
    );
  }

  const severity = listSession?.severity ?? 0;
  const severityLevel = getSeverityLevel(severity);
  const severityColor = getSeverityColor(severityLevel);
  const isCorrupted = listSession?.flags?.corrupted ?? false;
  const durationMs = currentSession.endedAt - currentSession.startedAt;
  const durationSec = Math.round(durationMs / 1000);

  return (
    <ScrollView style={styles.container}>
      {/* Session Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text variant="titleMedium" style={styles.sessionId}>
            {currentSession.id}
          </Text>
          <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
            <Text style={styles.severityText}>{severity.toFixed(1)}</Text>
          </View>
        </View>

        {isCorrupted && (
          <View style={styles.corruptedBanner}>
            <Text style={styles.corruptedText}>DATA CORRUPTED</Text>
          </View>
        )}

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {format(new Date(currentSession.startedAt), 'MMM d, yyyy HH:mm:ss')}
          </Text>
          <Text style={styles.metaText}>{durationSec}s</Text>
          <Text style={styles.metaText}>{sortedEvents.length} events</Text>
        </View>

        <View style={styles.deviceRow}>
          <Text style={styles.deviceText}>{currentSession.device?.ua || 'Unknown UA'}</Text>
          <Text style={styles.deviceText}>{currentSession.device?.viewport || ''}</Text>
        </View>

        {/* Stats chips */}
        {listSession?.stats && (
          <View style={styles.statsRow}>
            {listSession.stats.jsErrors > 0 && (
              <Chip compact style={styles.chipError}>JS: {listSession.stats.jsErrors}</Chip>
            )}
            {listSession.stats.failedRequests > 0 && (
              <Chip compact style={styles.chipError}>Failed: {listSession.stats.failedRequests}</Chip>
            )}
            {pendingRequests.filter(p => p.isPending).length > 0 && (
              <Chip compact style={styles.chipWarning}>
                Pending: {pendingRequests.filter(p => p.isPending).length}
              </Chip>
            )}
            {orphanedResponses.length > 0 && (
              <Chip compact style={styles.chipWarning}>
                Orphaned: {orphanedResponses.length}
              </Chip>
            )}
          </View>
        )}

        {/* Find Similar Button */}
        <Button
          mode="outlined"
          onPress={showSimilar ? handleCloseSimilar : handleFindSimilar}
          style={styles.similarButton}
          icon={showSimilar ? 'close' : 'content-copy'}
          compact
        >
          {showSimilar ? 'Hide Similar' : 'Find Similar Sessions'}
        </Button>
      </View>

      {/* Similar Sessions Section */}
      {showSimilar && (
        <View style={styles.section}>
          <SimilarSessionsList
            sessions={similarSessions}
            isLoading={isSearching}
            selectedId={selectedSimilar?.session.id ?? null}
            onSelect={handleSelectSimilar}
          />
        </View>
      )}

      {/* Diff Visualization */}
      {selectedSimilar && diff && (
        <View style={styles.section}>
          <SessionDiff
            sourceId={currentSession.id}
            targetId={selectedSimilar.session.id}
            diff={diff}
            similarity={selectedSimilar.similarity}
          />
        </View>
      )}

      {/* Category Filters */}
      <CategoryFilters
        enabledCategories={timelineFilters}
        onToggle={toggleTimelineCategory}
        eventCounts={eventCounts}
      />

      {/* Event Navigator */}
      <View style={styles.section}>
        <EventNavigator
          events={filteredEvents}
          currentIndex={currentEventIndex}
          onNavigate={handleNavigate}
        />
      </View>

      {/* Timeline */}
      <View style={styles.section}>
        {filteredEvents.length === 0 ? (
          <EmptyState
            icon="eye-off"
            title="No events visible"
            description="Enable at least one event category"
          />
        ) : (
          <Timeline
            events={sortedEvents}
            enabledCategories={timelineFilters}
            selectedEventId={selectedEvent?.eventId ?? null}
            onEventPress={handleEventPress}
          />
        )}
      </View>

      {/* Event Details Panel */}
      {selectedEvent && (
        <View style={styles.section}>
          <EventDetails
            event={selectedEvent}
            onClose={handleCloseDetails}
            isPending={pendingRequestIds.has(selectedEvent.eventId)}
            isOrphaned={orphanedResponseIds.has(selectedEvent.eventId)}
          />
        </View>
      )}

      {/* Spacer for scroll */}
      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionId: {
    fontFamily: 'monospace',
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  corruptedBanner: {
    backgroundColor: '#9C27B0',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  corruptedText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  deviceRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  deviceText: {
    fontSize: 11,
    color: '#999',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  chipError: {
    backgroundColor: '#FFEBEE',
  },
  chipWarning: {
    backgroundColor: '#FFF3E0',
  },
  similarButton: {
    marginTop: 4,
  },
  section: {
    marginHorizontal: 8,
    marginBottom: 8,
  },
  spacer: {
    height: 32,
  },
  error: {
    color: '#F44336',
  },
  loadingText: {
    marginTop: 16,
  },
});

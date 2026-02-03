import { View, StyleSheet } from 'react-native';
import { Text, ActivityIndicator, SegmentedButtons } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import { useEffect, useCallback, useRef, useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSessionStore } from '../src/stores';
import { SessionCard, FilterBar, EmptyState } from '../src/components';
import { hasActiveFilters } from '../src/utils/filters';
import type { Session, SortType } from '../src/types';

export default function SessionListScreen() {
  const router = useRouter();
  const listRef = useRef<FlashList<Session>>(null);
  const [isFocused, setIsFocused] = useState(true);

  // Track screen focus to prevent loading during navigation
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [])
  );

  const {
    allSessions,
    isLoading,
    error,
    hasMore,
    totalSessions,
    filters,
    sorting,
    scrollPosition,
    loadMore,
    setFilters,
    clearFilters,
    setSorting,
    setScrollPosition,
    getSortedSessions,
  } = useSessionStore();

  const sessions = getSortedSessions();
  const filtersActive = hasActiveFilters(filters);

  useEffect(() => {
    if (allSessions.length === 0) {
      loadMore();
    }
  }, []);

  // Restore scroll position when returning to this screen
  useEffect(() => {
    if (scrollPosition > 0 && sessions.length > 0) {
      listRef.current?.scrollToOffset({ offset: scrollPosition, animated: false });
    }
  }, [sessions.length > 0]);

  const handleEndReached = useCallback(() => {
    // Only load more when screen is focused to prevent loads during navigation
    if (!isLoading && hasMore && isFocused) {
      loadMore();
    }
  }, [isLoading, hasMore, isFocused, loadMore]);

  const handleSessionPress = useCallback((session: Session) => {
    router.push(`/session/${session.id}`);
  }, [router]);

  const handleScroll = useCallback((event: any) => {
    setScrollPosition(event.nativeEvent.contentOffset.y);
  }, [setScrollPosition]);

  const handleSortChange = useCallback((value: string) => {
    setSorting(value as SortType);
  }, [setSorting]);

  const renderItem = useCallback(({ item }: { item: Session }) => (
    <SessionCard
      session={item}
      onPress={() => handleSessionPress(item)}
    />
  ), [handleSessionPress]);

  const renderFooter = useCallback(() => {
    if (!isLoading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" />
      </View>
    );
  }, [isLoading]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;

    if (filtersActive && allSessions.length > 0) {
      return (
        <EmptyState
          icon="filter-off"
          title="No sessions match filters"
          description="Try adjusting your filter criteria"
          action={{
            label: 'Clear filters',
            onPress: clearFilters,
          }}
        />
      );
    }

    return (
      <EmptyState
        icon="folder-open"
        title="No sessions"
        description="No sessions have been loaded yet"
      />
    );
  }, [isLoading, filtersActive, allSessions.length, clearFilters]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text variant="bodyLarge" style={styles.error}>
          Error: {error.message}
        </Text>
      </View>
    );
  }

  if (isLoading && allSessions.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading sessions...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="bodySmall" style={styles.count}>
          {sessions.length}{filtersActive ? ` (filtered)` : ''} of {totalSessions}
        </Text>
        <SegmentedButtons
          value={sorting}
          onValueChange={handleSortChange}
          buttons={[
            { value: 'startedAt', label: 'Recent' },
            { value: 'severity', label: 'Severity' },
          ]}
          style={styles.sortButtons}
        />
      </View>

      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
      />

      <FlashList
        ref={listRef}
        data={sessions}
        renderItem={renderItem}
        estimatedItemSize={140}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
      />
    </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  count: {
    color: '#666',
  },
  sortButtons: {
    maxWidth: 200,
  },
  listContent: {
    paddingVertical: 8,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  error: {
    color: '#F44336',
  },
  loadingText: {
    marginTop: 16,
  },
});

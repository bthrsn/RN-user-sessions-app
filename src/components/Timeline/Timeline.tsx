import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { format } from 'date-fns';
import type { SessionEvent, EventCategory } from '../../types';
import { getEventCategory } from '../../types';
import { groupEventsByCategory, getEventTimeRange } from '../../utils/events';
import { TimelineLane } from './TimelineLane';

interface TimelineProps {
  events: SessionEvent[];
  enabledCategories: Set<EventCategory>;
  selectedEventId: string | null;
  onEventPress: (event: SessionEvent) => void;
}

const LANE_ORDER: EventCategory[] = ['nav', 'ui', 'net', 'error', 'perf', 'unknown'];

export function Timeline({
  events,
  enabledCategories,
  selectedEventId,
  onEventPress,
}: TimelineProps) {
  const timeRange = getEventTimeRange(events);
  const groupedEvents = groupEventsByCategory(events);

  if (!timeRange || events.length === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="bodyMedium" style={styles.emptyText}>
          No events to display
        </Text>
      </View>
    );
  }

  const { start, end } = timeRange;
  const durationMs = end - start;
  const durationSec = Math.round(durationMs / 1000);

  return (
    <View style={styles.container}>
      <View style={styles.timeHeader}>
        <Text style={styles.timeText}>{format(new Date(start), 'HH:mm:ss')}</Text>
        <Text style={styles.durationText}>{durationSec}s</Text>
        <Text style={styles.timeText}>{format(new Date(end), 'HH:mm:ss')}</Text>
      </View>

      <View style={styles.lanes}>
        {LANE_ORDER.map(category => {
          const categoryEvents = groupedEvents.get(category) || [];
          const enabled = enabledCategories.has(category);

          // Only show lane if it has events or is enabled
          if (categoryEvents.length === 0 && !enabled) {
            return null;
          }

          return (
            <TimelineLane
              key={category}
              category={category}
              events={enabled ? categoryEvents : []}
              startTime={start}
              endTime={end}
              selectedEventId={selectedEventId}
              onEventPress={onEventPress}
              enabled={enabled}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
  },
  timeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
  },
  durationText: {
    fontSize: 11,
    color: '#999',
  },
  lanes: {
    gap: 2,
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
  },
});

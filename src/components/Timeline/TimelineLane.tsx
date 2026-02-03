import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import type { SessionEvent, EventCategory } from '../../types';
import { getEventPosition } from '../../utils/events';

interface TimelineLaneProps {
  category: EventCategory;
  events: SessionEvent[];
  startTime: number;
  endTime: number;
  selectedEventId: string | null;
  onEventPress: (event: SessionEvent) => void;
  enabled: boolean;
}

const CATEGORY_COLORS: Record<EventCategory, string> = {
  nav: '#2196F3',    // Blue
  ui: '#4CAF50',     // Green
  net: '#FF9800',    // Orange
  error: '#F44336',  // Red
  perf: '#9C27B0',   // Purple
  unknown: '#607D8B', // Gray
};

const CATEGORY_LABELS: Record<EventCategory, string> = {
  nav: 'Navigation',
  ui: 'UI',
  net: 'Network',
  error: 'Errors',
  perf: 'Performance',
  unknown: 'Unknown',
};

export function TimelineLane({
  category,
  events,
  startTime,
  endTime,
  selectedEventId,
  onEventPress,
  enabled,
}: TimelineLaneProps) {
  const color = CATEGORY_COLORS[category];

  if (!enabled) {
    return (
      <View style={[styles.container, styles.disabled]}>
        <View style={styles.labelContainer}>
          <Text style={[styles.label, styles.labelDisabled]}>
            {CATEGORY_LABELS[category]}
          </Text>
        </View>
        <View style={styles.track} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color }]}>
          {CATEGORY_LABELS[category]}
        </Text>
        <Text style={styles.count}>{events.length}</Text>
      </View>
      <View style={styles.track}>
        {events.map(event => {
          const position = getEventPosition(event.ts, startTime, endTime);
          const isSelected = event.eventId === selectedEventId;

          return (
            <Pressable
              key={event.eventId}
              onPress={() => onEventPress(event)}
              style={[
                styles.marker,
                {
                  left: `${position}%`,
                  backgroundColor: color,
                },
                isSelected && styles.markerSelected,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: 8,
  },
  disabled: {
    opacity: 0.4,
  },
  labelContainer: {
    width: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  labelDisabled: {
    color: '#999',
  },
  count: {
    fontSize: 10,
    color: '#999',
  },
  track: {
    flex: 1,
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  marker: {
    position: 'absolute',
    width: 8,
    height: 16,
    top: 2,
    marginLeft: -4,
    borderRadius: 2,
  },
  markerSelected: {
    width: 12,
    height: 20,
    top: 0,
    marginLeft: -6,
    borderWidth: 2,
    borderColor: '#000',
  },
});

import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, IconButton, Divider } from 'react-native-paper';
import { format } from 'date-fns';
import type { SessionEvent } from '../../types';
import { getEventCategory } from '../../types';

interface EventDetailsProps {
  event: SessionEvent;
  onClose: () => void;
  isPending?: boolean;
  isOrphaned?: boolean;
}

const MAX_JSON_SIZE = 10000;

/**
 * Safely stringify and truncate large JSON data.
 */
function safeJsonStringify(data: unknown): string {
  try {
    const json = JSON.stringify(data, null, 2);
    if (json.length > MAX_JSON_SIZE) {
      return json.substring(0, MAX_JSON_SIZE) + '\n\n... (truncated)';
    }
    return json;
  } catch {
    return '[Unable to stringify data]';
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  nav: '#2196F3',
  ui: '#4CAF50',
  net: '#FF9800',
  error: '#F44336',
  perf: '#9C27B0',
  unknown: '#607D8B',
};

export function EventDetails({ event, onClose, isPending, isOrphaned }: EventDetailsProps) {
  const category = getEventCategory(event.type);
  const categoryColor = CATEGORY_COLORS[category];
  const formattedTime = format(new Date(event.ts), 'HH:mm:ss.SSS');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
            <Text style={styles.categoryText}>{category.toUpperCase()}</Text>
          </View>
          <Text variant="titleMedium" style={styles.type}>
            {event.type}
          </Text>
        </View>
        <IconButton icon="close" size={20} onPress={onClose} />
      </View>

      {(isPending || isOrphaned) && (
        <View style={styles.alerts}>
          {isPending && (
            <View style={[styles.alert, styles.alertWarning]}>
              <Text style={styles.alertText}>Pending Request (no response)</Text>
            </View>
          )}
          {isOrphaned && (
            <View style={[styles.alert, styles.alertError]}>
              <Text style={styles.alertText}>Orphaned (no matching request)</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.meta}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Event ID:</Text>
          <Text style={styles.metaValue}>{event.eventId}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Time:</Text>
          <Text style={styles.metaValue}>{formattedTime}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Timestamp:</Text>
          <Text style={styles.metaValue}>{event.ts}</Text>
        </View>
      </View>

      <Divider style={styles.divider} />

      <Text variant="labelMedium" style={styles.sectionTitle}>
        Event Data
      </Text>

      <ScrollView style={styles.jsonContainer} nestedScrollEnabled>
        <Text style={styles.json} selectable>
          {safeJsonStringify(event.data)}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    maxHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  type: {
    fontFamily: 'monospace',
    flex: 1,
  },
  alerts: {
    gap: 4,
    marginBottom: 8,
  },
  alert: {
    padding: 8,
    borderRadius: 4,
  },
  alertWarning: {
    backgroundColor: '#FFF3E0',
  },
  alertError: {
    backgroundColor: '#FFEBEE',
  },
  alertText: {
    fontSize: 12,
    fontWeight: '600',
  },
  meta: {
    gap: 4,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaLabel: {
    fontSize: 12,
    color: '#666',
    width: 80,
  },
  metaValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 1,
  },
  divider: {
    marginVertical: 8,
  },
  sectionTitle: {
    color: '#666',
    marginBottom: 8,
  },
  jsonContainer: {
    maxHeight: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    padding: 8,
  },
  json: {
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
});

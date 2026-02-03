import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { format } from 'date-fns';
import type { Session } from '../types';
import { getSeverityLevel, getSeverityColor } from '../utils/severity';

interface SessionCardProps {
  session: Session;
  onPress: () => void;
}

export function SessionCard({ session, onPress }: SessionCardProps) {
  const severityLevel = getSeverityLevel(session.severity ?? 0);
  const severityColor = getSeverityColor(severityLevel);

  const formattedDate = format(new Date(session.startedAt), 'MMM d, HH:mm');
  const durationSec = Math.round(session.durationMs / 1000);
  const durationFormatted = durationSec >= 60
    ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
    : `${durationSec}s`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        session.flags.corrupted && styles.cardCorrupted,
      ]}
    >
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.id}>
          {session.id}
        </Text>
        <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
          <Text style={styles.severityText}>
            {session.severity?.toFixed(1) ?? '0'}
          </Text>
        </View>
      </View>

      <View style={styles.routes}>
        <Text variant="bodySmall" style={styles.routeText}>
          {session.entryUrl} → {session.lastRoute}
        </Text>
      </View>

      <View style={styles.meta}>
        <Text variant="bodySmall" style={styles.metaText}>
          {formattedDate} • {durationFormatted} • {session.eventCount} events
        </Text>
      </View>

      <View style={styles.stats}>
        {session.stats.jsErrors > 0 && (
          <Chip compact style={styles.chipError} textStyle={styles.chipText}>
            JS: {session.stats.jsErrors}
          </Chip>
        )}
        {session.stats.failedRequests > 0 && (
          <Chip compact style={styles.chipError} textStyle={styles.chipText}>
            Failed: {session.stats.failedRequests}
          </Chip>
        )}
        {session.stats.pendingRequests > 0 && (
          <Chip compact style={styles.chipWarning} textStyle={styles.chipText}>
            Pending: {session.stats.pendingRequests}
          </Chip>
        )}
        {session.stats.rageClicks > 0 && (
          <Chip compact style={styles.chipWarning} textStyle={styles.chipText}>
            Rage: {session.stats.rageClicks}
          </Chip>
        )}
        {session.stats.deadClicks > 0 && (
          <Chip compact style={styles.chipInfo} textStyle={styles.chipText}>
            Dead: {session.stats.deadClicks}
          </Chip>
        )}
        {session.flags.corrupted && (
          <Chip compact style={styles.chipCorrupted} textStyle={styles.chipText}>
            CORRUPTED
          </Chip>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: '#f5f5f5',
  },
  cardCorrupted: {
    borderColor: '#9C27B0',
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  id: {
    fontFamily: 'monospace',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  severityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  routes: {
    marginBottom: 4,
  },
  routeText: {
    color: '#666',
    fontFamily: 'monospace',
  },
  meta: {
    marginBottom: 8,
  },
  metaText: {
    color: '#999',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  chipError: {
    backgroundColor: '#FFEBEE',
  },
  chipWarning: {
    backgroundColor: '#FFF3E0',
  },
  chipInfo: {
    backgroundColor: '#E3F2FD',
  },
  chipCorrupted: {
    backgroundColor: '#9C27B0',
  },
  chipText: {
    fontSize: 10,
  },
});

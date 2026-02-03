import { View, StyleSheet, Pressable } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import type { SimilarSession } from '../../utils/clustering';

interface SimilarSessionsListProps {
  sessions: SimilarSession[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (session: SimilarSession) => void;
}

export function SimilarSessionsList({
  sessions,
  isLoading,
  selectedId,
  onSelect,
}: SimilarSessionsListProps) {
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" />
        <Text style={styles.loadingText}>Finding similar sessions...</Text>
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No similar sessions found</Text>
        <Text style={styles.emptyHint}>
          Try loading more sessions or adjusting the similarity threshold
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="labelMedium" style={styles.title}>
        Similar Sessions ({sessions.length})
      </Text>
      {sessions.map(item => {
        const isSelected = item.session.id === selectedId;
        const similarityPercent = Math.round(item.similarity * 100);

        return (
          <Pressable
            key={item.session.id}
            onPress={() => onSelect(item)}
            style={[styles.item, isSelected && styles.itemSelected]}
          >
            <View style={styles.itemMain}>
              <Text style={styles.sessionId} numberOfLines={1}>
                {item.session.id}
              </Text>
              <Text style={styles.route} numberOfLines={1}>
                {item.session.entryUrl} → {item.session.lastRoute}
              </Text>
            </View>
            <View style={styles.itemRight}>
              <Text style={[styles.similarity, getSimilarityStyle(item.similarity)]}>
                {similarityPercent}%
              </Text>
              <Text style={styles.distance}>
                dist: {item.distance}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function getSimilarityStyle(similarity: number) {
  if (similarity >= 0.8) return { color: '#4CAF50' };
  if (similarity >= 0.6) return { color: '#FF9800' };
  return { color: '#F44336' };
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  title: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  loading: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 12,
  },
  empty: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
  emptyHint: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  item: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemSelected: {
    backgroundColor: '#E3F2FD',
  },
  itemMain: {
    flex: 1,
  },
  sessionId: {
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 2,
  },
  route: {
    fontSize: 11,
    color: '#666',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  similarity: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  distance: {
    fontSize: 10,
    color: '#999',
  },
});

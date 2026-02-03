import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { DiffResult } from '../../utils/clustering';
import { simplifyEventType } from '../../utils/clustering';

interface SessionDiffProps {
  sourceId: string;
  targetId: string;
  diff: DiffResult[];
  similarity: number;
}

export function SessionDiff({ sourceId, targetId, diff, similarity }: SessionDiffProps) {
  const similarityPercent = Math.round(similarity * 100);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleSmall" style={styles.headerText}>
          Similarity: {similarityPercent}%
        </Text>
      </View>

      <View style={styles.columns}>
        <View style={styles.columnHeader}>
          <Text style={styles.columnTitle} numberOfLines={1}>
            {sourceId}
          </Text>
        </View>
        <View style={styles.columnHeader}>
          <Text style={styles.columnTitle} numberOfLines={1}>
            {targetId}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.diffList} nestedScrollEnabled>
        {diff.map((item, index) => (
          <DiffRow key={index} item={item} />
        ))}
      </ScrollView>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.matchBg]} />
          <Text style={styles.legendText}>Match</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.insertBg]} />
          <Text style={styles.legendText}>Insert</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.deleteBg]} />
          <Text style={styles.legendText}>Delete</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.substituteBg]} />
          <Text style={styles.legendText}>Change</Text>
        </View>
      </View>
    </View>
  );
}

function DiffRow({ item }: { item: DiffResult }) {
  const getRowStyle = () => {
    switch (item.type) {
      case 'match':
        return styles.matchBg;
      case 'insert':
        return styles.insertBg;
      case 'delete':
        return styles.deleteBg;
      case 'substitute':
        return styles.substituteBg;
    }
  };

  return (
    <View style={[styles.row, getRowStyle()]}>
      <View style={styles.cell}>
        {item.sourceEvent && (
          <Text style={styles.eventText} numberOfLines={1}>
            {simplifyEventType(item.sourceEvent)}
          </Text>
        )}
      </View>
      <View style={styles.cell}>
        {item.targetEvent && (
          <Text style={styles.eventText} numberOfLines={1}>
            {simplifyEventType(item.targetEvent)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    textAlign: 'center',
  },
  columns: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  columnHeader: {
    flex: 1,
    padding: 8,
    backgroundColor: '#fafafa',
  },
  columnTitle: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#666',
    textAlign: 'center',
  },
  diffList: {
    maxHeight: 300,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cell: {
    flex: 1,
    padding: 6,
    minHeight: 28,
    justifyContent: 'center',
  },
  eventText: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  matchBg: {
    backgroundColor: '#fff',
  },
  insertBg: {
    backgroundColor: '#E8F5E9',
  },
  deleteBg: {
    backgroundColor: '#FFEBEE',
  },
  substituteBg: {
    backgroundColor: '#FFF3E0',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    padding: 8,
    backgroundColor: '#fafafa',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  legendText: {
    fontSize: 10,
    color: '#666',
  },
});

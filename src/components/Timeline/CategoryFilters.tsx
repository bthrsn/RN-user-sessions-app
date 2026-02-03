import { View, StyleSheet, ScrollView } from 'react-native';
import { Chip } from 'react-native-paper';
import type { EventCategory } from '../../types';

interface CategoryFiltersProps {
  enabledCategories: Set<EventCategory>;
  onToggle: (category: EventCategory) => void;
  eventCounts: Map<EventCategory, number>;
}

const CATEGORIES: EventCategory[] = ['nav', 'ui', 'net', 'error', 'perf', 'unknown'];

const CATEGORY_LABELS: Record<EventCategory, string> = {
  nav: 'Nav',
  ui: 'UI',
  net: 'Network',
  error: 'Errors',
  perf: 'Perf',
  unknown: 'Other',
};

const CATEGORY_COLORS: Record<EventCategory, string> = {
  nav: '#2196F3',
  ui: '#4CAF50',
  net: '#FF9800',
  error: '#F44336',
  perf: '#9C27B0',
  unknown: '#607D8B',
};

export function CategoryFilters({
  enabledCategories,
  onToggle,
  eventCounts,
}: CategoryFiltersProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {CATEGORIES.map(category => {
        const count = eventCounts.get(category) || 0;
        const enabled = enabledCategories.has(category);

        return (
          <Chip
            key={category}
            selected={enabled}
            onPress={() => onToggle(category)}
            style={[
              styles.chip,
              enabled && { backgroundColor: `${CATEGORY_COLORS[category]}20` },
            ]}
            textStyle={[
              styles.chipText,
              enabled && { color: CATEGORY_COLORS[category] },
            ]}
            compact
          >
            {CATEGORY_LABELS[category]} ({count})
          </Chip>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 44,
  },
  content: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  chip: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 11,
  },
});

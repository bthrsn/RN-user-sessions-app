import { View, StyleSheet, ScrollView } from 'react-native';
import { Chip, TextInput, IconButton, Text } from 'react-native-paper';
import { useState, useCallback } from 'react';
import type { Filters } from '../types';
import { hasActiveFilters } from '../utils/filters';

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Partial<Filters>) => void;
  onClearFilters: () => void;
}

export function FilterBar({ filters, onFiltersChange, onClearFilters }: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [urlInput, setUrlInput] = useState(filters.urlPattern);

  const hasFilters = hasActiveFilters(filters);

  const handleUrlSubmit = useCallback(() => {
    onFiltersChange({ urlPattern: urlInput });
  }, [urlInput, onFiltersChange]);

  const handleUrlClear = useCallback(() => {
    setUrlInput('');
    onFiltersChange({ urlPattern: '' });
  }, [onFiltersChange]);

  const toggleFilter = useCallback((key: keyof Omit<Filters, 'urlPattern'>) => {
    onFiltersChange({ [key]: !filters[key] });
  }, [filters, onFiltersChange]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon={expanded ? 'chevron-up' : 'filter-variant'}
          onPress={() => setExpanded(!expanded)}
          size={20}
        />
        <Text variant="bodySmall" style={styles.label}>
          Filters {hasFilters ? '(active)' : ''}
        </Text>
        {hasFilters && (
          <IconButton
            icon="close-circle"
            onPress={onClearFilters}
            size={18}
          />
        )}
      </View>

      {expanded && (
        <View style={styles.content}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsRow}
          >
            <Chip
              selected={filters.jsErrors}
              onPress={() => toggleFilter('jsErrors')}
              style={styles.chip}
              compact
            >
              JS Errors
            </Chip>
            <Chip
              selected={filters.failedRequests}
              onPress={() => toggleFilter('failedRequests')}
              style={styles.chip}
              compact
            >
              Failed Requests
            </Chip>
            <Chip
              selected={filters.pendingRequests}
              onPress={() => toggleFilter('pendingRequests')}
              style={styles.chip}
              compact
            >
              Pending
            </Chip>
            <Chip
              selected={filters.rageClicks}
              onPress={() => toggleFilter('rageClicks')}
              style={styles.chip}
              compact
            >
              Rage Clicks
            </Chip>
            <Chip
              selected={filters.deadClicks}
              onPress={() => toggleFilter('deadClicks')}
              style={styles.chip}
              compact
            >
              Dead Clicks
            </Chip>
            <Chip
              selected={filters.corrupted}
              onPress={() => toggleFilter('corrupted')}
              style={[styles.chip, filters.corrupted && styles.chipCorrupted]}
              compact
            >
              Corrupted
            </Chip>
          </ScrollView>

          <View style={styles.urlRow}>
            <TextInput
              mode="outlined"
              dense
              placeholder="URL filter (substring or /regex/)"
              value={urlInput}
              onChangeText={setUrlInput}
              onSubmitEditing={handleUrlSubmit}
              style={styles.urlInput}
              right={
                urlInput ? (
                  <TextInput.Icon icon="close" onPress={handleUrlClear} />
                ) : undefined
              }
            />
            <IconButton
              icon="magnify"
              onPress={handleUrlSubmit}
              mode="contained"
              size={20}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  label: {
    flex: 1,
    color: '#666',
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  chipsRow: {
    marginBottom: 8,
  },
  chip: {
    marginRight: 8,
  },
  chipCorrupted: {
    backgroundColor: '#E1BEE7',
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urlInput: {
    flex: 1,
    marginRight: 8,
  },
});

import { View, StyleSheet } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useEffect } from 'react';
import { useSessionStore } from '../src/stores';

export default function SessionListScreen() {
  const {
    allSessions,
    isLoading,
    error,
    loadMore,
  } = useSessionStore();

  useEffect(() => {
    if (allSessions.length === 0) {
      loadMore();
    }
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
      <Text variant="bodyMedium">
        Sessions loaded: {allSessions.length}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  error: {
    color: '#F44336',
  },
  loadingText: {
    marginTop: 16,
  },
});

import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import type { SessionEvent } from '../../types';
import { findNextEvent, isErrorType, isFailedRequest } from '../../utils/events';
import { analyzeNetworkEvents } from '../../utils/events';

interface EventNavigatorProps {
  events: SessionEvent[];
  currentIndex: number;
  onNavigate: (event: SessionEvent, index: number) => void;
}

export function EventNavigator({
  events,
  currentIndex,
  onNavigate,
}: EventNavigatorProps) {
  const { pendingRequests } = analyzeNetworkEvents(events);
  const pendingRequestIds = new Set(
    pendingRequests.filter(p => p.isPending).map(p => p.request.eventId)
  );

  const handleNextError = () => {
    const result = findNextEvent(events, currentIndex, isErrorType);
    if (result) {
      onNavigate(result.event, result.index);
    }
  };

  const handleNextFailed = () => {
    const result = findNextEvent(events, currentIndex, isFailedRequest);
    if (result) {
      onNavigate(result.event, result.index);
    }
  };

  const handleNextPending = () => {
    const result = findNextEvent(events, currentIndex, event =>
      pendingRequestIds.has(event.eventId)
    );
    if (result) {
      onNavigate(result.event, result.index);
    }
  };

  // Check if there are any items ahead
  const hasNextError = findNextEvent(events, currentIndex, isErrorType) !== null;
  const hasNextFailed = findNextEvent(events, currentIndex, isFailedRequest) !== null;
  const hasNextPending = findNextEvent(events, currentIndex, event =>
    pendingRequestIds.has(event.eventId)
  ) !== null;

  return (
    <View style={styles.container}>
      <Text variant="labelSmall" style={styles.label}>Jump to next:</Text>
      <View style={styles.buttons}>
        <Button
          mode="outlined"
          compact
          onPress={handleNextError}
          disabled={!hasNextError}
          style={styles.button}
          labelStyle={styles.buttonLabel}
        >
          Error
        </Button>
        <Button
          mode="outlined"
          compact
          onPress={handleNextFailed}
          disabled={!hasNextFailed}
          style={styles.button}
          labelStyle={styles.buttonLabel}
        >
          Failed
        </Button>
        <Button
          mode="outlined"
          compact
          onPress={handleNextPending}
          disabled={!hasNextPending}
          style={styles.button}
          labelStyle={styles.buttonLabel}
        >
          Pending
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    gap: 8,
  },
  label: {
    color: '#666',
  },
  buttons: {
    flexDirection: 'row',
    gap: 6,
  },
  button: {
    minWidth: 0,
  },
  buttonLabel: {
    fontSize: 11,
    marginHorizontal: 8,
  },
});

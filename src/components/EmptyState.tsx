import { View, StyleSheet } from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Icon source={icon} size={48} color="#999" />
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      {description && (
        <Text variant="bodyMedium" style={styles.description}>
          {description}
        </Text>
      )}
      {action && (
        <Button
          mode="outlined"
          onPress={action.onPress}
          style={styles.button}
        >
          {action.label}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    marginTop: 16,
    color: '#666',
  },
  description: {
    marginTop: 8,
    color: '#999',
    textAlign: 'center',
  },
  button: {
    marginTop: 16,
  },
});

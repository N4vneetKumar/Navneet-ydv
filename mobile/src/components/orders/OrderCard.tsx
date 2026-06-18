import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { Order } from '../../types';

interface Props {
  order: Order;
  onPress?: () => void;
  showFlag?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#FF9800',
  assigned: '#2196F3',
  in_progress: '#9C27B0',
  completed: '#4CAF50',
  cancelled: '#9E9E9E',
  disputed: '#F44336',
};

export default function OrderCard({ order, onPress, showFlag }: Props) {
  const itemsSummary = order.items?.map((i) => i.item_name).join(', ') || 'No items';

  return (
    <Card style={[styles.card, order.flagged && showFlag && styles.flagged]} onPress={onPress}>
      <Card.Content>
        <View style={styles.row}>
          <Text variant="titleMedium">#{order.id.slice(0, 8)}</Text>
          <Chip
            compact
            style={{ backgroundColor: STATUS_COLORS[order.status] || '#999' }}
            textStyle={{ color: '#fff', fontSize: 11 }}
          >
            {order.status.replace('_', ' ')}
          </Chip>
        </View>
        {order.customer_name && (
          <Text variant="bodyMedium" style={styles.meta}>{order.customer_name}</Text>
        )}
        <Text variant="bodySmall" numberOfLines={2} style={styles.meta}>{itemsSummary}</Text>
        <Text variant="bodySmall" style={styles.meta}>
          {order.pickup_date} • {order.pickup_time_slot}
        </Text>
        {order.status === 'completed' && (
          <Text variant="bodyMedium" style={styles.amount}>
            {order.actual_weight}kg • ₹{order.total_amount}
          </Text>
        )}
        {order.flagged && showFlag && (
          <Chip icon="alert" style={styles.flagChip} textStyle={{ color: '#fff' }}>
            FLAGGED — Weight mismatch
          </Chip>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginVertical: 6 },
  flagged: { borderColor: '#F44336', borderWidth: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { color: '#666', marginTop: 4 },
  amount: { color: '#2E7D32', fontWeight: 'bold', marginTop: 8 },
  flagChip: { marginTop: 8, backgroundColor: '#F44336' },
});

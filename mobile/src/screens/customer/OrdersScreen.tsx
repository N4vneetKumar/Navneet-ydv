import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import OrderCard from '../../components/orders/OrderCard';
import { Order } from '../../types';

const FILTERS = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function CustomerOrdersScreen() {
  const [filter, setFilter] = useState('pending');
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const statuses = filter === 'pending'
      ? ['pending', 'assigned', 'in_progress']
      : [filter];
    const results = await Promise.all(
      statuses.map((s) => api.get<Order[]>('/orders', { params: { status: s } }))
    );
    setOrders(results.flatMap((r) => r.data));
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={filter}
        onValueChange={setFilter}
        buttons={FILTERS}
        style={styles.segment}
      />
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OrderCard order={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<View style={styles.empty}><Text style={{ textAlign: 'center', color: '#999' }}>No orders found</Text></View>}
        contentContainerStyle={orders.length === 0 ? styles.emptyList : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  segment: { margin: 16 },
  empty: { textAlign: 'center', padding: 32, color: '#999' },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
});

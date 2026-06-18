import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, Modal, ScrollView, Linking } from 'react-native';
import { SegmentedButtons, Button, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import OrderCard from '../../components/orders/OrderCard';
import WeighPayModal from './WeighPayModal/WeighPayModal';
import { Order } from '../../types';

const FILTERS = [
  { value: 'assigned', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

export default function PickupTasksScreen() {
  const [filter, setFilter] = useState('assigned');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [showWeigh, setShowWeigh] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get<Order[]>('/orders', { params: { status: filter } });
    setOrders(data);
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const startTrip = async (order: Order) => {
    await api.patch(`/orders/${order.id}/start`);
    setFilter('in_progress');
    load();
  };

  const callCustomer = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={styles.container}>
      <SegmentedButtons value={filter} onValueChange={setFilter} buttons={FILTERS} style={styles.segment} />
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => setSelected(item)}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No tasks</Text>}
      />

      <Modal visible={!!selected && !showWeigh} animationType="slide">
        <ScrollView style={styles.modal}>
          {selected && (
            <>
              <Text variant="titleLarge">{selected.customer_name}</Text>
              <Text>{selected.address?.address_line}</Text>
              <Text>Landmark: {selected.address?.landmark || '—'}</Text>
              <Text>Phone: {selected.customer_phone}</Text>
              <Text>Items: {selected.items.map((i) => i.item_name).join(', ')}</Text>

              <Button
                mode="outlined"
                icon="map-marker"
                onPress={() => Linking.openURL(
                  `https://www.google.com/maps/dir/?api=1&destination=${selected.gps_lat},${selected.gps_long}`
                )}
                style={styles.btn}
              >
                Navigate
              </Button>

              {filter === 'assigned' && (
                <>
                  <Button mode="contained" onPress={() => startTrip(selected)} style={styles.btn}>Start Trip</Button>
                  <Button mode="outlined" onPress={() => callCustomer(selected.customer_phone)}>Call Customer</Button>
                </>
              )}

              {filter === 'in_progress' && (
                <Button mode="contained" onPress={() => setShowWeigh(true)} style={styles.btn}>
                  Reached & Weigh Scrap
                </Button>
              )}

              <Button onPress={() => setSelected(null)} style={styles.btn}>Close</Button>
            </>
          )}
        </ScrollView>
      </Modal>

      {selected && showWeigh && (
        <WeighPayModal
          order={selected}
          visible={showWeigh}
          onClose={() => { setShowWeigh(false); setSelected(null); load(); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  segment: { margin: 16 },
  empty: { textAlign: 'center', padding: 32, color: '#999' },
  modal: { flex: 1, padding: 24, paddingTop: 48 },
  btn: { marginVertical: 8 },
});
